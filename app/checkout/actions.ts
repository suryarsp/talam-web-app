'use server'

import { cookies, headers } from 'next/headers'
import QRCode from 'qrcode'
import { requireTenant } from '@/lib/auth-guard'
import { createServerClient } from '@/lib/supabase/server'
import { cookieDomain } from '@/lib/supabase/cookie-domain'
import { resolveOrCreateGuestCustomer } from '@/lib/auth/resolve-guest-customer'
import { uploadImage } from '@/lib/cloudinary'
import { prisma, withTenant } from '@/lib/prisma'
import { createNotification } from '@/lib/data/notifications'
import { sendNewOrderEmail, sendOrderPlacedEmail, type OrderEmailItem } from '@/lib/resend'
import { getAdminUrl, getStoreUrl, isLocalDevHost } from '@/lib/tenant-url'
import { orderCode } from '@/lib/data/storefront-orders'
import { buildUpiIntent } from '@/lib/payments/upi'
import { createRazorpayOrder, getRazorpayKeys, verifyRazorpaySignature } from '@/lib/payments/razorpay'
import { getDeliveryEstimate } from '@/lib/shipping/shiprocket'
import { formatDeliveryDate } from '@/lib/shipping/delivery-estimate'
import {
  checkCoupon,
  computeQuote,
  decrementStock,
  stockFor,
  COUPON_ERROR_MESSAGE,
  type CouponRow,
  type Quote,
  type QuoteLine,
} from '@/lib/checkout-pricing'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Proves, for the two Razorpay follow-up actions below, that THIS browser is the one that
// just placed a given guest order — without it, "no session" would mean "no ownership check
// at all" and any anonymous visitor could act on any order in the tenant by simply not
// signing in. Scoped to the single most recent guest order, which is all one checkout needs.
const GUEST_ORDER_COOKIE = 'guest_order_auth'

async function setGuestOrderCookie(orderId: string, customerId: string) {
  const store = await cookies()
  store.set(GUEST_ORDER_COOKIE, `${orderId}:${customerId}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60,
    path: '/',
    domain: cookieDomain(),
  })
}

/** Returns the guest customerId authorized for `orderId` by this browser's cookie, or null. */
async function readGuestOrderCustomerId(orderId: string): Promise<string | null> {
  const store = await cookies()
  const [cookieOrderId, customerId] = (store.get(GUEST_ORDER_COOKIE)?.value ?? '').split(':')
  return cookieOrderId === orderId && customerId ? customerId : null
}

export type CartLine = { productId: string; size?: string | null; quantity: number }

export type PaymentProvider = 'upi_manual' | 'razorpay' | 'cod'

/**
 * Everything below re-reads prices, stock and coupons from the database. The client
 * sends product ids, sizes and quantities only — any total it computed is for display.
 */

/** What the shopper is told about delivery, alongside the money `Quote` already carries. */
export type QuoteDelivery = {
  /** The fee *before* the free-delivery threshold zeroes it — what the strikethrough shows. */
  fullFee: number
  /** 'live' is a real courier quote for this pincode; 'flat' is the store's own fee, used
   *  whenever no pincode is known yet or the courier could not be reached. */
  source: 'live' | 'flat'
  etaDays: number | null
  codAvailable: boolean | null
  /** What COD adds on top of `fullFee` for this pincode — null on the flat fallback, or when
   *  the shopper hasn't chosen COD, so nothing has been quoted for it yet. */
  codSurcharge: number | null
}

const FLAT_DELIVERY = (fee: number): QuoteDelivery => ({
  fullFee: fee,
  source: 'flat',
  etaDays: null,
  codAvailable: null,
  codSurcharge: null,
})

const NOT_SERVICEABLE = "We can't currently deliver to this pincode."

type PricingContext = {
  tenantId: string
  quote: Quote
  lines: (QuoteLine & { productName: string })[]
  coupon: { id: string; code: string } | null
  storeName: string
  delivery: QuoteDelivery
}

/**
 * `pincode` turns the flat shipping fee into a live courier rate. It is optional because the
 * shopper has not typed an address yet on first load — and because a store with no Shiprocket
 * account, or an unreachable Shiprocket, must still be able to sell at its own flat fee.
 */
async function priceCart(
  tenantId: string,
  cart: CartLine[],
  couponCode?: string,
  pincode?: string,
  paymentMethod: PaymentProvider = 'upi_manual'
): Promise<PricingContext | { error: string }> {
  const clean = cart.filter((l) => Number.isInteger(l.quantity) && l.quantity > 0)
  if (clean.length === 0) return { error: 'Your cart is empty.' }

  const [tenant, products] = await withTenant(tenantId, (db) =>
    Promise.all([
      db.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true, shippingFee: true, freeDeliveryAbove: true, defaultShippingWeight: true },
      }),
      db.product.findMany({
        where: { id: { in: clean.map((l) => l.productId) }, tenantId, deletedAt: null, isActive: true, status: 'published' },
        select: { id: true, name: true, price: true, comparePrice: true, stockBySize: true, weight: true },
      }),
    ])
  )
  if (!tenant) return { error: 'Store not found.' }

  const byId = new Map(products.map((p) => [p.id, p]))
  const lines: (QuoteLine & { productName: string })[] = []
  let weightKg = 0

  for (const line of clean) {
    const product = byId.get(line.productId)
    if (!product) return { error: 'One of the items in your cart is no longer available.' }

    const size = line.size ?? null
    if (stockFor(product.stockBySize, size) < line.quantity) {
      return { error: `${product.name}${size ? ` (${size})` : ''} is out of stock.` }
    }

    weightKg += Number(product.weight ?? tenant.defaultShippingWeight) * line.quantity

    lines.push({
      productId: product.id,
      productName: product.name,
      size,
      quantity: line.quantity,
      unitPrice: Number(product.price),
      compareAtPrice: product.comparePrice === null ? null : Number(product.comparePrice),
    })
  }

  const delivery = await quoteDelivery(tenantId, Number(tenant.shippingFee), pincode, weightKg, paymentMethod)
  if ('error' in delivery) return delivery

  const itemsTotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0)

  let couponRow: (CouponRow & { id: string; code: string }) | null = null
  if (couponCode?.trim()) {
    const found = await withTenant(tenantId, (db) =>
      db.discountCode.findUnique({ where: { tenantId_code: { tenantId, code: couponCode.trim().toUpperCase() } } })
    )
    if (!found) return { error: COUPON_ERROR_MESSAGE.not_found }
    const row: CouponRow & { id: string; code: string } = {
      id: found.id,
      code: found.code,
      type: found.type,
      value: Number(found.value),
      minOrder: found.minOrder === null ? null : Number(found.minOrder),
      usesLimit: found.usesLimit,
      usesCount: found.usesCount,
      expiresAt: found.expiresAt,
      isActive: found.isActive,
    }
    const rejection = checkCoupon(row, itemsTotal)
    if (rejection) return { error: COUPON_ERROR_MESSAGE[rejection] }
    couponRow = row
  }

  return {
    tenantId,
    storeName: tenant.name,
    lines,
    coupon: couponRow ? { id: couponRow.id, code: couponRow.code } : null,
    delivery,
    quote: computeQuote({
      lines,
      shippingFee: delivery.fullFee + (delivery.codSurcharge ?? 0),
      freeDeliveryAbove: tenant.freeDeliveryAbove === null ? null : Number(tenant.freeDeliveryAbove),
      coupon: couponRow,
    }),
  }
}

/**
 * An unserviceable pincode is the one delivery answer that stops checkout: there is no honest
 * price to charge for a parcel no courier will carry. Every other failure degrades to the flat
 * fee silently — a store whose Shiprocket is down still has to be able to take orders.
 */
async function quoteDelivery(
  tenantId: string,
  flatFee: number,
  pincode: string | undefined,
  weightKg: number,
  paymentMethod: PaymentProvider
): Promise<QuoteDelivery | { error: string }> {
  if (!pincode) return FLAT_DELIVERY(flatFee)

  // Always priced as prepaid first: Shiprocket folds its own COD collection charge into `rate`
  // when cod=1 is requested, so this is the fare every non-COD shopper actually pays, and the
  // one a COD shopper's base fee is compared against below.
  const estimate = await getDeliveryEstimate(tenantId, { pincode, weightKg, cod: false })
  if ('error' in estimate) return FLAT_DELIVERY(flatFee)
  if (!estimate.serviceable) return { error: NOT_SERVICEABLE }
  if (estimate.rate === undefined) return FLAT_DELIVERY(flatFee)

  let codSurcharge: number | null = null
  if (paymentMethod === 'cod') {
    const codEstimate = await getDeliveryEstimate(tenantId, { pincode, weightKg, cod: true })
    if (!('error' in codEstimate) && codEstimate.serviceable && codEstimate.rate !== undefined) {
      codSurcharge = Math.max(0, Math.round(codEstimate.rate - estimate.rate))
    }
  }

  return {
    fullFee: estimate.rate,
    source: 'live',
    etaDays: estimate.etaDays ?? null,
    codAvailable: estimate.codAvailable ?? null,
    codSurcharge,
  }
}

function isError(value: PricingContext | { error: string }): value is { error: string } {
  return 'error' in value
}

/** What the summary card renders: unit prices come back from the DB too, so the line items and the total can never disagree. */
export type QuotedLine = { productId: string; size: string | null; quantity: number; unitPrice: number }

export type QuoteResult = { quote: Quote; lines: QuotedLine[]; delivery: QuoteDelivery }

function toQuoteResult(priced: PricingContext): QuoteResult {
  return {
    quote: priced.quote,
    delivery: priced.delivery,
    lines: priced.lines.map((l) => ({ productId: l.productId, size: l.size, quantity: l.quantity, unitPrice: l.unitPrice })),
  }
}

/** Server-authoritative totals for display — the client never decides what anything costs. */
export async function getQuoteAction(
  cart: CartLine[],
  couponCode?: string,
  pincode?: string,
  paymentMethod: PaymentProvider = 'upi_manual'
): Promise<QuoteResult | { error: string }> {
  const { tenantId } = await requireTenant()
  const priced = await priceCart(tenantId, cart, couponCode, pincode, paymentMethod)
  return isError(priced) ? priced : toQuoteResult(priced)
}

export type AvailableCoupon = { code: string; type: 'percent' | 'fixed'; value: number }

/** Active, unexpired, not-yet-exhausted codes to promote near the coupon field — not a
 *  substitute for validateCouponAction, which re-checks everything (incl. minOrder) at apply time. */
export async function getAvailableCouponsAction(): Promise<AvailableCoupon[]> {
  const { tenantId } = await requireTenant()
  const now = new Date()
  const codes = await withTenant(tenantId, (db) =>
    db.discountCode.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { code: true, type: true, value: true, usesLimit: true, usesCount: true },
    })
  )
  return codes
    .filter((c) => c.usesLimit === null || c.usesCount < c.usesLimit)
    .map((c) => ({ code: c.code, type: c.type, value: Number(c.value) }))
}

export async function validateCouponAction(
  code: string,
  cart: CartLine[]
): Promise<(QuoteResult & { code: string }) | { error: string }> {
  const { tenantId } = await requireTenant()
  const priced = await priceCart(tenantId, cart, code)
  if (isError(priced)) return priced
  return { ...toQuoteResult(priced), code: priced.coupon?.code ?? code.trim().toUpperCase() }
}

/** UPI QR for the exact server-computed total, from the store's own VPA. */
export async function getUpiQrAction(
  cart: CartLine[],
  couponCode?: string
): Promise<{ intent: string; svgDataUri: string; total: number; vpa: string } | { error: string }> {
  const { tenantId } = await requireTenant()
  const priced = await priceCart(tenantId, cart, couponCode)
  if (isError(priced)) return priced

  const tenant = await withTenant(tenantId, (db) =>
    db.tenant.findUnique({ where: { id: tenantId }, select: { paymentConfig: true } })
  )
  const upi = (tenant?.paymentConfig as { upi?: { enabled?: boolean; upiId?: string } } | null)?.upi
  if (!upi?.enabled || !upi.upiId) return { error: 'This store has not set up UPI payments yet.' }

  const intent = buildUpiIntent({
    vpa: upi.upiId,
    storeName: priced.storeName,
    amount: priced.quote.total,
    note: `Order at ${priced.storeName}`,
  })
  const svg = await QRCode.toString(intent, { type: 'svg', margin: 1, width: 240 })

  return {
    intent,
    svgDataUri: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
    total: priced.quote.total,
    vpa: upi.upiId,
  }
}

export type PlaceOrderInput = {
  cart: CartLine[]
  couponCode?: string
  paymentProvider: PaymentProvider
  /** Mandatory for both guest and signed-in checkout — guests get an account resolved/created from it. */
  email: string
  /** Either an existing saved address, or a new one to use for this order. */
  addressId?: string
  address?: {
    name: string
    phone: string
    line1: string
    line2?: string
    city: string
    state: string
    pincode: string
  }
  /** UPI reference number, when paying by UPI. */
  utr?: string
  /** Uploaded payment screenshot URL — accepted as an alternative to a UTR, when paying by UPI. */
  paymentProofUrl?: string
}

export async function uploadPaymentProofAction(file: File): Promise<{ url: string } | { error: string }> {
  const { tenantId } = await requireTenant()
  try {
    const url = await uploadImage(file, `talam/${tenantId}/payment-proofs`)
    return { url }
  } catch {
    return { error: 'Upload failed. Please try again.' }
  }
}

export async function placeOrderAction(input: PlaceOrderInput): Promise<{ orderId: string } | { error: string }> {
  const { tenantId } = await requireTenant()
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!EMAIL_RE.test(input.email?.trim() ?? '')) {
    return { error: 'Enter a valid email address.' }
  }

  // Address first: its pincode is what makes the order's shipping fee the same live rate the
  // shopper was shown, and what lets an unserviceable pincode stop the order here too. Guests
  // never have saved addresses (the checkout page only loads them for a signed-in user), so
  // ignore any addressId a guest submission might carry and force a new address.
  const addressInput = user ? input : { ...input, addressId: undefined }
  const shippingAddress = await resolveAddress(tenantId, user?.id ?? '', addressInput)
  if (!shippingAddress) return { error: 'A delivery address is required.' }

  const priced = await priceCart(tenantId, input.cart, input.couponCode, shippingAddress.pincode, input.paymentProvider)
  if (isError(priced)) return priced

  let customerId: string
  if (user) {
    customerId = user.id
    // Backfill only — never overwrite an email already on file.
    await withTenant(tenantId, (db) =>
      db.customer.updateMany({ where: { id: user.id, tenantId, email: null }, data: { email: input.email.trim() } })
    )
  } else {
    const resolved = await resolveOrCreateGuestCustomer(tenantId, { email: input.email.trim(), phone: shippingAddress.phone })
    if ('error' in resolved) {
      return { error: 'An account already exists for this email or phone. Sign in to continue.' }
    }
    customerId = resolved.customerId
  }

  const hasValidUtr = /^\d{12}$/.test(input.utr ?? '')
  if (input.paymentProvider === 'upi_manual' && !hasValidUtr && !input.paymentProofUrl) {
    return { error: 'Enter the 12-digit UPI reference number, or upload a payment screenshot.' }
  }

  let orderId: string
  try {
    orderId = await withTenant(tenantId, async (db) => {
      // Re-read stock inside the transaction: priceCart's check was advisory, this one
      // is the one that actually prevents two shoppers buying the last item.
      for (const line of priced.lines) {
        const product = await db.product.findUniqueOrThrow({
          where: { id: line.productId },
          select: { stockBySize: true },
        })
        if (stockFor(product.stockBySize, line.size) < line.quantity) {
          throw new OutOfStockError(line.productName, line.size)
        }
        await db.product.update({
          where: { id: line.productId },
          data: { stockBySize: decrementStock(product.stockBySize, line.size, line.quantity) },
        })
      }

      const order = await db.order.create({
        data: {
          tenantId,
          customerId,
          status: 'pending',
          itemsTotal: priced.quote.itemsTotal,
          discount: priced.quote.couponDiscount,
          shippingFee: priced.quote.shippingFee,
          discountCode: priced.coupon?.code ?? null,
          total: priced.quote.total,
          estimatedDeliveryDays: priced.delivery.etaDays,
          paymentProvider: input.paymentProvider,
          paymentId: input.paymentProvider === 'upi_manual' ? (input.utr || null) : null,
          paymentProofUrl: input.paymentProvider === 'upi_manual' ? (input.paymentProofUrl ?? null) : null,
          paymentStatus: 'pending',
          shippingAddress,
          items: {
            create: priced.lines.map((line) => ({
              tenantId,
              productId: line.productId,
              productName: line.productName,
              size: line.size,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
            })),
          },
        },
        select: { id: true },
      })

      if (priced.coupon) {
        await db.discountCode.update({
          where: { id: priced.coupon.id },
          data: { usesCount: { increment: 1 } },
        })
      }

      return order.id
    })
  } catch (err) {
    if (err instanceof OutOfStockError) {
      return { error: `${err.productName}${err.size ? ` (${err.size})` : ''} just went out of stock.` }
    }
    throw err
  }

  // No session to prove ownership on the next call (Razorpay create/verify) — this cookie
  // is that proof instead, scoped to exactly this order.
  if (!user) await setGuestOrderCookie(orderId, customerId)

  // The order row is the source of truth — a mail or notification failure must never
  // undo a placed (and possibly paid) order, so this is deliberately outside the transaction.
  try {
    await notifyOrderPlaced({ tenantId, customerId, orderId, priced, shippingAddress })
  } catch (err) {
    console.error('[checkout] order notifications failed for', orderId, err)
  }

  return { orderId }
}

class OutOfStockError extends Error {
  constructor(readonly productName: string, readonly size: string | null) {
    super('out_of_stock')
  }
}

async function resolveAddress(tenantId: string, customerId: string, input: PlaceOrderInput) {
  if (input.addressId) {
    const saved = await withTenant(tenantId, (db) =>
      db.address.findFirst({ where: { id: input.addressId, tenantId, customerId } })
    )
    if (!saved) return null
    return {
      name: saved.name,
      phone: saved.phone,
      line1: saved.line1,
      line2: saved.line2 ?? '',
      city: saved.city,
      state: saved.state,
      pincode: saved.pincode,
    }
  }
  if (!input.address) return null
  return { ...input.address, line2: input.address.line2 ?? '' }
}

type ShippingAddress = { name: string; phone: string; line1: string; line2: string; city: string; state: string; pincode: string }

async function notifyOrderPlaced(params: {
  tenantId: string
  customerId: string
  orderId: string
  priced: PricingContext
  shippingAddress: ShippingAddress
}) {
  const { tenantId, orderId, priced } = params
  const code = orderCode(orderId)

  const [tenant, customer, host] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true, name: true, contactEmail: true, notifyEmailOnOrder: true },
    }),
    prisma.customer.findUnique({ where: { id: params.customerId }, select: { name: true, email: true } }),
    headers().then((h) => h.get('host')),
  ])
  if (!tenant) return

  // getStoreUrl/getAdminUrl return a bare path in local dev; emails need an absolute
  // URL, so prefix the request origin there.
  const isLocalDev = isLocalDevHost(host)
  const origin = isLocalDev ? `http://${host ?? 'localhost:3000'}` : ''
  const storeUrl = `${origin}${getStoreUrl(tenant.slug, isLocalDev)}`
  const adminOrdersUrl = `${origin}${getAdminUrl(tenant.slug, isLocalDev).replace(/\/admin\/dashboard$/, '/admin/orders')}`

  const items: OrderEmailItem[] = priced.lines.map((line) => ({
    name: line.productName,
    size: line.size,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
  }))

  await createNotification(tenantId, {
    type: 'new_order',
    title: `New order ${code}`,
    body: `${customer?.name ?? 'A customer'} placed an order worth ₹${priced.quote.total.toLocaleString('en-IN')}.`,
    link: '/admin/orders',
  })

  if (customer?.email) {
    await sendOrderPlacedEmail(customer.email, {
      storeName: tenant.name,
      orderCode: code,
      items,
      total: priced.quote.total,
      addressLines: [
        params.shippingAddress.name,
        [params.shippingAddress.line1, params.shippingAddress.line2].filter(Boolean).join(', '),
        `${params.shippingAddress.city}, ${params.shippingAddress.state} ${params.shippingAddress.pincode}`,
        params.shippingAddress.phone,
      ].filter(Boolean),
      trackUrl: `${storeUrl}/orders/${orderId}`,
      invoiceUrl: `${storeUrl}/orders/${orderId}/invoice`,
      estimatedDeliveryText:
        priced.delivery.etaDays === null ? undefined : formatDeliveryDate(new Date(), priced.delivery.etaDays),
    })
  } else {
    console.info('[checkout] no customer email on file — skipping order confirmation mail for', code)
  }

  if (tenant.notifyEmailOnOrder && tenant.contactEmail) {
    await sendNewOrderEmail(tenant.contactEmail, {
      storeName: tenant.name,
      orderCode: code,
      customerName: customer?.name ?? 'A customer',
      items,
      total: priced.quote.total,
      adminOrdersUrl,
    })
  }
}

/**
 * Re-attaches a fresh payment attempt to an ALREADY-CREATED pending order, instead of the
 * caller creating a new one. Without this, every failed/retried payment (e.g. Razorpay
 * declines, then the shopper switches to UPI) would mint a duplicate order — same cart,
 * same stock decrement, same total — because placeOrderAction has no notion of "resume."
 * Only ever touches payment fields; pricing, stock and the order-placed notification were
 * already settled when the order was first created and must not run again.
 */
export async function retryOrderPaymentAction(
  orderId: string,
  input: { paymentProvider: Exclude<PaymentProvider, 'razorpay'>; utr?: string; paymentProofUrl?: string }
): Promise<{ orderId: string } | { error: string }> {
  const { tenantId } = await requireTenant()
  const {
    data: { user },
  } = await (await createServerClient()).auth.getUser()

  const customerId = user ? user.id : await readGuestOrderCustomerId(orderId)
  if (!customerId) return { error: 'Order not found.' }

  const hasValidUtr = /^\d{12}$/.test(input.utr ?? '')
  if (input.paymentProvider === 'upi_manual' && !hasValidUtr && !input.paymentProofUrl) {
    return { error: 'Enter the 12-digit UPI reference number, or upload a payment screenshot.' }
  }

  const result = await withTenant(tenantId, (db) =>
    db.order.updateMany({
      // Only a still-open order may be redirected to a new payment method — a webhook
      // marking the original Razorpay attempt 'failed' after the shopper already moved
      // on to UPI must not block them from completing checkout.
      where: { id: orderId, tenantId, customerId, paymentStatus: { in: ['pending', 'failed'] } },
      data: {
        paymentProvider: input.paymentProvider,
        paymentId: input.paymentProvider === 'upi_manual' ? (input.utr || null) : null,
        paymentProofUrl: input.paymentProvider === 'upi_manual' ? (input.paymentProofUrl ?? null) : null,
        paymentStatus: 'pending',
      },
    })
  )
  if (result.count === 0) return { error: 'Order not found.' }

  return { orderId }
}

// ── Razorpay ──

export async function createRazorpayOrderAction(
  orderId: string
): Promise<{ razorpayOrderId: string; keyId: string; amountPaise: number } | { error: string }> {
  const { tenantId } = await requireTenant()
  const {
    data: { user },
  } = await (await createServerClient()).auth.getUser()

  const keys = getRazorpayKeys()
  if (!keys) return { error: 'Card & netbanking payments are not available right now.' }

  const customerId = user ? user.id : await readGuestOrderCustomerId(orderId)
  if (!customerId) return { error: 'Order not found.' }

  const order = await withTenant(tenantId, (db) =>
    db.order.findFirst({ where: { id: orderId, tenantId, customerId }, select: { total: true } })
  )
  if (!order) return { error: 'Order not found.' }

  const amountPaise = Math.round(Number(order.total) * 100)
  const razorpayOrder = await createRazorpayOrder(amountPaise, orderId)

  await withTenant(tenantId, (db) =>
    db.order.update({ where: { id: orderId }, data: { paymentId: razorpayOrder.id } })
  )

  return { razorpayOrderId: razorpayOrder.id, keyId: keys.keyId, amountPaise }
}

export async function verifyRazorpayPaymentAction(params: {
  orderId: string
  razorpayOrderId: string
  razorpayPaymentId: string
  signature: string
}): Promise<{ ok: true } | { error: string }> {
  const { tenantId } = await requireTenant()
  const {
    data: { user },
  } = await (await createServerClient()).auth.getUser()

  if (
    !verifyRazorpaySignature({
      razorpayOrderId: params.razorpayOrderId,
      razorpayPaymentId: params.razorpayPaymentId,
      signature: params.signature,
    })
  ) {
    return { error: 'Payment could not be verified.' }
  }

  const customerId = user ? user.id : await readGuestOrderCustomerId(params.orderId)
  if (!customerId) return { error: 'Payment could not be verified.' }

  await withTenant(tenantId, (db) =>
    db.order.updateMany({
      where: { id: params.orderId, tenantId, customerId },
      data: { paymentStatus: 'paid', paymentId: params.razorpayPaymentId, status: 'confirmed' },
    })
  )
  return { ok: true }
}
