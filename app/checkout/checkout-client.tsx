'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { Check, ChevronDown, Loader2, Truck } from 'lucide-react'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCartStore, type CartItem } from '@/lib/store/cart'
import { formatCurrency } from '@/lib/utils'
import { formatDeliveryDate } from '@/lib/shipping/delivery-estimate'
import { CheckoutHeader } from '@/components/checkout/checkout-header'
import { StepIndicator } from '@/components/checkout/step-indicator'
import { OrderSummaryCard, TrustBar } from '@/components/checkout/order-summary-card'
import { GoogleButton } from '@/components/auth/google-button'
import { OtpForm } from '@/components/auth/otp-form'
import { useStoreBase, useStoreHref } from '@/components/store/store-context'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { AddressItem } from '@/lib/data/addresses'
import type { Quote } from '@/lib/checkout-pricing'
import {
  createRazorpayOrderAction,
  getAvailableCouponsAction,
  getQuoteAction,
  getUpiQrAction,
  placeOrderAction,
  uploadPaymentProofAction,
  validateCouponAction,
  verifyRazorpayPaymentAction,
  type AvailableCoupon,
  type CartLine,
  type PaymentProvider,
  type QuoteDelivery,
  type QuotedLine,
} from './actions'
import type { EnabledPaymentMethods } from './page'

const addressSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  phone: z.string().trim().min(10, 'Enter a valid 10-digit phone number'),
  line1: z.string().trim().min(1, 'Address line 1 is required'),
  line2: z.string().optional(),
  pincode: z.string().trim().length(6, 'Pincode must be 6 digits'),
  city: z.string().trim().min(1, 'City is required'),
  state: z.string().trim().min(1, 'State is required'),
})
type AddressForm = z.infer<typeof addressSchema>

const EMPTY_ADDRESS: AddressForm = { name: '', phone: '', line1: '', line2: '', pincode: '', city: '', state: '' }
const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
  'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka',
  'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim',
  'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
]

const NEW_ADDRESS = 'new'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function fieldClass(hasError: boolean) {
  return `h-auto w-full rounded-lg border-[1.5px] px-[14px] py-[13px] font-body text-sm text-fg outline-none transition-colors focus-visible:border-store-primary focus-visible:ring-0 ${
    hasError ? 'border-danger' : 'border-border'
  }`
}

function toCartLines(items: CartItem[]): CartLine[] {
  return items.map((i) => ({ productId: i.productId, size: i.size ?? null, quantity: i.quantity }))
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void }
  }
}

export function CheckoutClient({
  storeName,
  signedIn,
  signedInPhone,
  signedInName,
  signedInEmail,
  addresses,
  methods,
}: {
  storeName: string
  signedIn: boolean
  signedInPhone: string | null
  signedInName: string | null
  signedInEmail: string | null
  addresses: AddressItem[]
  methods: EnabledPaymentMethods
}) {
  const router = useRouter()
  const storeBase = useStoreBase()
  const cartHref = useStoreHref('/cart')
  const items = useCartStore((s) => s.items)
  const clear = useCartStore((s) => s.clear)

  const [step, setStep] = useState<1 | 2 | 3>(signedIn ? 2 : 1)

  // ── Server-priced quote — the only totals shown anywhere on this page ──
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null)

  const cartLines = useMemo(() => toCartLines(items), [items])
  // Cart array identity changes every render, so key SWR on its contents instead.
  const cartKey = useMemo(() => JSON.stringify(cartLines), [cartLines])

  const { data: availableCoupons } = useSWR('available-coupons', getAvailableCouponsAction, { revalidateOnFocus: false })

  // ── Contact email — mandatory for both guest and signed-in checkout ──
  const [email, setEmail] = useState(signedInEmail ?? '')
  const [emailError, setEmailError] = useState('')

  // ── Address ──
  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? NEW_ADDRESS
  )
  // ponytail: pre-fill name/phone from signed-in customer so the form isn't blank
  const prefilled: AddressForm = {
    ...EMPTY_ADDRESS,
    ...(signedInName ? { name: signedInName } : {}),
    ...(signedInPhone ? { phone: signedInPhone.replace(/^\+91/, '') } : {}),
  }
  const { control: addressControl, trigger: triggerAddress, setValue } = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
    defaultValues: addresses.length > 0 ? EMPTY_ADDRESS : prefilled,
  })
  const newAddress = useWatch({ control: addressControl })

  // ponytail: auto-fill city/state from pincode via India Post API
  const pincodeValue = newAddress.pincode ?? ''
  const lastLookedUp = useRef('')
  useEffect(() => {
    if (pincodeValue.length !== 6 || pincodeValue === lastLookedUp.current) return
    lastLookedUp.current = pincodeValue
    fetch(`https://api.postalpincode.in/pincode/${pincodeValue}`)
      .then((r) => r.json())
      .then((data) => {
        const po = data?.[0]?.PostOffice?.[0]
        if (!po) return
        setValue('city', po.District, { shouldValidate: true })
        setValue('state', po.State, { shouldValidate: true })
      })
      .catch(() => {})
  }, [pincodeValue, setValue])
  const usingNewAddress = selectedAddressId === NEW_ADDRESS
  const savedAddress = addresses.find((a) => a.id === selectedAddressId) ?? null

  // A half-typed pincode is worth nothing to a courier, so only a complete one is quoted —
  // until then the server prices delivery at the store's own flat fee, exactly as before.
  const addressPincode = usingNewAddress ? pincodeValue : (savedAddress?.pincode ?? '')
  const quotePincode = /^\d{6}$/.test(addressPincode) ? addressPincode : ''

  // Declared ahead of the quote below: a COD surcharge is only fetched from Shiprocket once
  // the shopper has actually chosen to pay COD, so the quote has to know the current selection.
  const firstMethod: PaymentProvider = methods.upi ? 'upi_manual' : methods.razorpay ? 'razorpay' : 'cod'
  const [paymentMethod, setPaymentMethod] = useState<PaymentProvider>(firstMethod)

  const { data: quoteResult } = useSWR(
    cartLines.length > 0 ? ['quote', cartKey, appliedCoupon, quotePincode, paymentMethod] : null,
    () => getQuoteAction(cartLines, appliedCoupon ?? undefined, quotePincode || undefined, paymentMethod),
    { revalidateOnFocus: false }
  )

  const quote: Quote | null = quoteResult && !('error' in quoteResult) ? quoteResult.quote : null
  const quotedLines: QuotedLine[] = quoteResult && !('error' in quoteResult) ? quoteResult.lines : []
  const delivery: QuoteDelivery | null = quoteResult && !('error' in quoteResult) ? quoteResult.delivery : null
  const quoteError = quoteResult && 'error' in quoteResult ? quoteResult.error : ''

  // A cart the server refuses to price has no honest total to charge — an unserviceable
  // pincode is the case that matters, but any pricing failure blocks the order the same way.
  const blockedByQuote = Boolean(quoteError)

  // Merge the server's authoritative prices onto the cart's names and images.
  const summaryItems = useMemo<CartItem[]>(() => {
    if (quotedLines.length === 0) return items
    return items.map((item) => {
      const line = quotedLines.find((l) => l.productId === item.productId && l.size === (item.size ?? null))
      return line ? { ...item, price: line.unitPrice } : item
    })
  }, [items, quotedLines])

  // ── Payment ──
  const [utr, setUtr] = useState('')
  const [paymentProofUrl, setPaymentProofUrl] = useState('')
  const [uploadingProof, setUploadingProof] = useState(false)
  const [proofError, setProofError] = useState('')
  const [placing, setPlacing] = useState(false)
  const [placeError, setPlaceError] = useState('')
  const [orderPlaced, setOrderPlaced] = useState(false)

  // QR is regenerated whenever the amount could have changed — it encodes the exact total.
  const { data: qrResult } = useSWR(
    step === 3 && paymentMethod === 'upi_manual' && cartLines.length > 0 ? ['upi-qr', cartKey, appliedCoupon] : null,
    () => getUpiQrAction(cartLines, appliedCoupon ?? undefined),
    { revalidateOnFocus: false }
  )
  const upiQr = qrResult && !('error' in qrResult) ? qrResult : null
  const upiError = qrResult && 'error' in qrResult ? qrResult.error : ''

  if (items.length === 0 && !orderPlaced) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <p className="font-body text-sm text-muted-warm">Your cart is empty.</p>
        <button onClick={() => router.push(cartHref)} className="mt-4 font-body text-sm font-semibold text-store-primary">
          ← Back to Cart
        </button>
      </main>
    )
  }

  if (placing) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-store-primary" />
        <p className="font-body text-sm font-medium text-fg">Placing your order…</p>
      </main>
    )
  }

  async function handleContinueFromAddress() {
    if (!EMAIL_RE.test(email.trim())) {
      setEmailError('Enter a valid email address')
      return
    }
    setEmailError('')
    if (usingNewAddress) {
      if (!(await triggerAddress())) return
    } else if (!savedAddress) {
      return
    }
    setStep(3)
  }

  async function handlePlaceOrder() {
    if (placing) return
    setPlaceError('')
    setPlacing(true)

    const result = await placeOrderAction({
      cart: cartLines,
      couponCode: appliedCoupon ?? undefined,
      paymentProvider: paymentMethod,
      email: email.trim(),
      addressId: usingNewAddress ? undefined : selectedAddressId,
      address: usingNewAddress ? (newAddress as AddressForm) : undefined,
      utr: paymentMethod === 'upi_manual' ? utr : undefined,
      paymentProofUrl: paymentMethod === 'upi_manual' ? paymentProofUrl || undefined : undefined,
    })

    if ('error' in result) {
      setPlacing(false)
      setPlaceError(result.error)
      return
    }

    if (paymentMethod === 'razorpay') {
      const ok = await payWithRazorpay(result.orderId)
      if (!ok) {
        setPlacing(false)
        // The order exists as pending — the customer can retry payment from their orders page.
        setPlaceError('Payment was not completed. Your order is saved as unpaid.')
        return
      }
    }

    setOrderPlaced(true)
    clear()
    router.push(`${storeBase}/checkout/confirmed/${result.orderId}`)
  }

  async function payWithRazorpay(orderId: string): Promise<boolean> {
    const created = await createRazorpayOrderAction(orderId)
    if ('error' in created) {
      setPlaceError(created.error)
      return false
    }
    const loaded = await loadRazorpayScript()
    if (!loaded || !window.Razorpay) return false

    return new Promise<boolean>((resolve) => {
      const checkout = new window.Razorpay!({
        key: created.keyId,
        amount: created.amountPaise,
        currency: 'INR',
        name: storeName,
        order_id: created.razorpayOrderId,
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          const verified = await verifyRazorpayPaymentAction({
            orderId,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          })
          resolve(!('error' in verified))
        },
        modal: { ondismiss: () => resolve(false) },
      })
      checkout.open()
    })
  }

  const total = quote?.total ?? 0
  const payLabel = step === 1 ? `Pay ₹${total.toLocaleString('en-IN')}` : step === 2 ? 'Continue to Payment' : 'Place Order'
  const canPlaceUpi = utr.length === 12 || Boolean(paymentProofUrl)

  return (
    <div className="min-h-screen bg-bg pb-28 sm:pb-10">
      <CheckoutHeader
        storeName={storeName}
        onBack={step === 1 ? () => router.push(cartHref) : () => setStep((s) => (s - 1) as 1 | 2)}
      />
      <StepIndicator current={step} />

      <main className="mx-auto max-w-5xl px-4 pb-4 sm:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1 space-y-3">
            {step === 1 && (
              <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
                {signedIn ? (
                  <div className="flex items-center justify-between rounded-lg border border-success/20 bg-success/[0.08] px-3.5 py-3">
                    <div className="flex items-center gap-2">
                      <Check className="h-[18px] w-[18px] text-success" />
                      <span className="font-body text-sm font-medium text-fg">Verified</span>
                    </div>
                    <span className="font-body text-sm text-muted-warm">{signedInPhone ?? ''}</span>
                  </div>
                ) : (
                  <>
                    <OtpForm onVerified={() => router.refresh()} syncEndpoint={`${storeBase}/api/auth/sync`} />
                    <div className="my-5 flex items-center gap-3">
                      <span className="h-px flex-1 bg-border-light" />
                      <span className="font-body text-[11px] text-muted-warm">or continue with</span>
                      <span className="h-px flex-1 bg-border-light" />
                    </div>
                    <GoogleButton redirectPath={`${storeBase}/auth/callback`} next={`${storeBase}/checkout`} />
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="mt-4 w-full text-center font-body text-[13px] font-semibold text-muted-warm underline"
                    >
                      Continue as guest
                    </button>
                  </>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
                <h2 className="mb-4 font-heading text-base font-bold text-fg">Delivery Address</h2>

                <div className="mb-4">
                  <label htmlFor="email" className="mb-1.5 block font-body text-[13px] font-bold text-fg">
                    Email<span className="text-danger">*</span>
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={fieldClass(!!emailError)}
                  />
                  {emailError && <p className="mt-1 font-body text-xs text-danger">{emailError}</p>}
                </div>

                {addresses.length > 0 && (
                  <div className="mb-4 space-y-2.5">
                    {addresses.map((addr) => (
                      <label
                        key={addr.id}
                        className={`flex cursor-pointer gap-3 rounded-[10px] border-[1.5px] p-3.5 ${
                          selectedAddressId === addr.id ? 'border-store-primary' : 'border-border'
                        }`}
                      >
                        <input
                          type="radio"
                          name="address"
                          checked={selectedAddressId === addr.id}
                          onChange={() => setSelectedAddressId(addr.id)}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-store-primary"
                        />
                        <span className="min-w-0">
                          <span className="flex items-center gap-2">
                            <span className="font-body text-sm font-bold text-fg">{addr.label}</span>
                            {addr.isDefault && (
                              <span className="rounded-full bg-success/10 px-2 py-0.5 font-body text-[10px] font-bold uppercase tracking-wide text-success">
                                Default
                              </span>
                            )}
                          </span>
                          <span className="mt-0.5 block font-body text-sm text-fg">{addr.name}</span>
                          <span className="block font-body text-xs text-muted-warm">
                            {[addr.line1, addr.line2, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ')}
                          </span>
                          <span className="block font-body text-xs text-muted-warm">{addr.phone}</span>
                        </span>
                      </label>
                    ))}
                    <label
                      className={`flex cursor-pointer items-center gap-3 rounded-[10px] border-[1.5px] p-3.5 ${
                        usingNewAddress ? 'border-store-primary' : 'border-border'
                      }`}
                    >
                      <input
                        type="radio"
                        name="address"
                        checked={usingNewAddress}
                        onChange={() => setSelectedAddressId(NEW_ADDRESS)}
                        className="h-4 w-4 shrink-0 accent-store-primary"
                      />
                      <span className="font-body text-sm font-semibold text-fg">Use a new address</span>
                    </label>
                  </div>
                )}

                {usingNewAddress && (
                  <div className="grid grid-cols-2 gap-3">
                    <AddressField control={addressControl} name="name" label="Name" span />
                    <AddressField control={addressControl} name="phone" label="Phone" span digits={10} />
                    <AddressField control={addressControl} name="line1" label="Address line 1" span />
                    <AddressField control={addressControl} name="line2" label="Address line 2 (optional)" span optional />
                    <AddressField control={addressControl} name="pincode" label="Pincode" digits={6} />
                    <AddressField control={addressControl} name="city" label="City" />
                    <div className="relative col-span-2">
                      <label className="mb-1.5 block font-body text-[13px] font-bold text-fg">
                        State<span className="text-danger">*</span>
                      </label>
                      <Controller
                        control={addressControl}
                        name="state"
                        render={({ field, fieldState }) => (
                          <>
                            <select {...field} className={`${fieldClass(!!fieldState.error)} appearance-none bg-surface`}>
                              <option value="">Select state</option>
                              {INDIAN_STATES.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                            {fieldState.error ? (
                              <p className="mt-1 font-body text-xs text-danger">{fieldState.error.message}</p>
                            ) : null}
                          </>
                        )}
                      />
                      <ChevronDown className="pointer-events-none absolute right-3.5 top-[38px] h-4 w-4 text-muted-warm" />
                    </div>
                  </div>
                )}

                {/* Right under the pincode field — the shopper must see this without scrolling. */}
                {quoteError && <p className="mt-4 font-body text-sm text-danger">{quoteError}</p>}

                <Button
                  onClick={handleContinueFromAddress}
                  disabled={blockedByQuote}
                  className="mt-5 h-12 w-full rounded-[10px] bg-store-primary font-body text-[16px] font-bold text-surface hover:bg-store-primary/90 disabled:opacity-50"
                >
                  Continue to Payment
                </Button>
              </div>
            )}

            {step === 3 && (
              <>
                <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="font-body text-[13px] font-bold text-fg">Delivering To</span>
                    <button onClick={() => setStep(2)} className="font-body text-xs font-semibold text-store-primary">
                      Edit
                    </button>
                  </div>
                  <DeliveringTo address={savedAddress} newAddress={usingNewAddress ? (newAddress as AddressForm) : null} />
                </div>

                {/* ponytail: reciprocity moment — show value before asking for payment */}
                <div className="mt-3 flex flex-col gap-2 rounded-xl border border-success/20 bg-success/5 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 shrink-0 text-success" />
                    <span className="font-body text-sm font-medium text-fg">
                      {quote && quote.shippingFee === 0
                        ? 'You\'ve unlocked free delivery!'
                        : delivery?.source === 'live' && delivery.etaDays !== null
                          ? `Estimated delivery by ${formatDeliveryDate(new Date(), delivery.etaDays)}`
                          : 'Estimated delivery in 5–7 business days'}
                    </span>
                  </div>
                  {quote && (quote.productDiscount + quote.couponDiscount) > 0 && (
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 shrink-0 text-success" />
                      <span className="font-body text-sm font-medium text-success">
                        You&apos;re saving {formatCurrency(quote.productDiscount + quote.couponDiscount)} on this order
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex flex-col gap-2.5">
                  {methods.upi && (
                    <PaymentTile
                      selected={paymentMethod === 'upi_manual'}
                      onSelect={() => setPaymentMethod('upi_manual')}
                      badge="UPI"
                      title="UPI"
                      subtitle="Scan with any UPI app — GPay, PhonePe, Paytm"
                    >
                      <div className="mt-4 border-t border-border pt-4">
                        {upiQr ? (
                          // A data: URI SVG — nothing for next/image to optimise.
                          <img
                            src={upiQr.svgDataUri}
                            alt={`UPI QR code to pay ₹${total} to ${upiQr.vpa}`}
                            className="mx-auto h-[160px] w-[160px]"
                          />
                        ) : (
                          <div className="mx-auto flex h-[160px] w-[160px] items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-warm" />
                          </div>
                        )}
                        <p className="mt-3 text-center font-body text-[12px] uppercase tracking-[0.04em] text-muted-warm">UPI ID</p>
                        <p className="break-all text-center font-body text-[15px] font-bold text-fg">{upiQr?.vpa ?? '—'}</p>
                        <p className="mt-3 font-body text-[13px] leading-[1.6] text-muted-warm">
                          1. Open any UPI app and scan the QR code
                          <br />
                          2. Pay ₹{total.toLocaleString('en-IN')} to complete the order
                          <br />
                          3. Enter the 12-digit UTR number below to confirm
                        </p>
                        <label htmlFor="utr" className="mb-1.5 mt-3 block font-body text-[13px] font-bold text-fg">
                          UTR Number
                        </label>
                        <Input
                          id="utr"
                          value={utr}
                          onChange={(e) => setUtr(e.target.value.replace(/\D/g, '').slice(0, 12))}
                          placeholder="12-digit reference number"
                          inputMode="numeric"
                          className="h-auto w-full rounded-lg border-[1.5px] border-border px-[13px] py-[11px] font-body text-[15px] text-fg focus-visible:border-store-primary focus-visible:ring-0"
                        />
                        <p className="mt-1 font-body text-xs text-muted-warm">12-digit reference number from your payment app</p>

                        <p className="mt-3 text-center font-body text-xs text-muted-warm">— or —</p>
                        <label htmlFor="paymentProof" className="mb-1.5 mt-2 block font-body text-[13px] font-bold text-fg">
                          Upload payment screenshot
                        </label>
                        <input
                          id="paymentProof"
                          type="file"
                          accept="image/*"
                          disabled={uploadingProof}
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            setUploadingProof(true)
                            setProofError('')
                            const result = await uploadPaymentProofAction(file)
                            setUploadingProof(false)
                            if ('error' in result) {
                              setProofError(result.error)
                              return
                            }
                            setPaymentProofUrl(result.url)
                          }}
                          className="w-full rounded-lg border-[1.5px] border-border px-3.25 py-2.25 font-body text-sm text-fg file:mr-3 file:rounded-md file:border-0 file:bg-bg file:px-3 file:py-1.5 file:font-body file:text-xs file:font-semibold"
                        />
                        {uploadingProof && <p className="mt-1 font-body text-xs text-muted-warm">Uploading…</p>}
                        {proofError && <p className="mt-1 font-body text-xs text-danger">{proofError}</p>}
                        {paymentProofUrl && !uploadingProof && <p className="mt-1 font-body text-xs text-success">Screenshot uploaded ✓</p>}
                        <p className="mt-1 font-body text-xs text-muted-warm">Either the UTR number or a payment screenshot is required — we&apos;ll verify it before confirming your order.</p>

                        <Button
                          onClick={handlePlaceOrder}
                          disabled={!canPlaceUpi || placing || blockedByQuote}
                          className="mt-4 h-12 w-full rounded-[10px] bg-store-primary font-body text-[16px] font-bold text-surface hover:bg-store-primary/90 disabled:opacity-50"
                        >
                          Confirm Payment
                        </Button>
                      </div>
                    </PaymentTile>
                  )}

                  {methods.razorpay && (
                    <PaymentTile
                      selected={paymentMethod === 'razorpay'}
                      onSelect={() => setPaymentMethod('razorpay')}
                      badge="RZ"
                      title="Razorpay"
                      subtitle="Cards, netbanking & wallets"
                    >
                      <p className="mt-3 border-t border-border pt-3 font-body text-[13px] leading-[1.5] text-muted-warm">
                        You&apos;ll complete your payment securely with Razorpay.
                      </p>
                    </PaymentTile>
                  )}

                  {methods.instamojo && (
                    <div className="cursor-not-allowed rounded-[10px] border-[1.5px] border-border p-4 opacity-60">
                      <div className="flex items-center gap-3">
                        <div className="flex h-7 w-10 shrink-0 items-center justify-center rounded bg-bg-dark font-body text-[11px] font-bold text-blue-300">
                          IM
                        </div>
                        <div>
                          <p className="font-body text-[15px] font-bold text-fg">Instamojo</p>
                          <p className="font-body text-xs text-muted-warm">Coming soon</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {methods.cod && (
                    <PaymentTile
                      selected={paymentMethod === 'cod'}
                      onSelect={() => setPaymentMethod('cod')}
                      badge="COD"
                      title="Pay on Delivery"
                      subtitle="Pay in cash or UPI when your order arrives"
                    >
                      {delivery?.codSurcharge ? (
                        <p className="mt-3 border-t border-border pt-3 font-body text-[13px] leading-[1.5] text-muted-warm">
                          Cash on Delivery adds a ₹{delivery.codSurcharge} handling charge, already included in your
                          total of ₹{total.toLocaleString('en-IN')} below.
                        </p>
                      ) : null}
                    </PaymentTile>
                  )}

                  {!methods.upi && !methods.razorpay && !methods.cod && (
                    <p className="rounded-[10px] border border-border bg-surface p-4 font-body text-sm text-muted-warm">
                      This store hasn&apos;t finished setting up payments yet.
                    </p>
                  )}
                </div>

                {(placeError || upiError) && (
                  <p className="mt-3 font-body text-sm text-danger">{placeError || upiError}</p>
                )}

                {((paymentMethod === 'razorpay' && methods.razorpay) || (paymentMethod === 'cod' && methods.cod)) && (
                  <Button
                    onClick={handlePlaceOrder}
                    disabled={placing || blockedByQuote}
                    className="mt-4 h-12 w-full rounded-[10px] bg-store-primary font-body text-[16px] font-bold text-surface hover:bg-store-primary/90 disabled:opacity-50"
                  >
                    {paymentMethod === 'cod' ? 'Place Order' : `Pay ₹${total.toLocaleString('en-IN')}`}
                  </Button>
                )}
              </>
            )}

            <div className="space-y-3 sm:hidden">
              <Summary items={summaryItems} quote={quote} delivery={delivery} error={quoteError} />
              <CouponField
                cartLines={cartLines}
                applied={appliedCoupon}
                onApplied={setAppliedCoupon}
                available={availableCoupons}
              />
              <TrustBar />
            </div>
          </div>

          <div className="hidden w-[360px] shrink-0 space-y-3 sm:block">
            <Summary items={summaryItems} quote={quote} delivery={delivery} error={quoteError} />
            <CouponField cartLines={cartLines} applied={appliedCoupon} onApplied={setAppliedCoupon} available={availableCoupons} />
            <TrustBar />
          </div>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-border bg-surface px-4 py-3 sm:hidden">
        <div>
          <p className="font-body text-[13px] text-muted-warm">Order Total</p>
          <p className="font-body text-[20px] font-bold text-fg">₹{total.toLocaleString('en-IN')}</p>
        </div>
        {step !== 1 && !(step === 3 && paymentMethod === 'upi_manual') && (
          <Button
            onClick={step === 2 ? handleContinueFromAddress : handlePlaceOrder}
            disabled={placing || blockedByQuote}
            className="h-12 shrink-0 rounded-[10px] bg-store-primary px-6 font-body text-[15px] font-bold text-surface hover:bg-store-primary/90"
          >
            {payLabel}
          </Button>
        )}
      </div>
    </div>
  )
}

function Summary({
  items,
  quote,
  delivery,
  error,
}: {
  items: CartItem[]
  quote: Quote | null
  delivery: QuoteDelivery | null
  error: string
}) {
  if (error) {
    return <p className="rounded-xl border border-danger/30 bg-danger/5 p-4 font-body text-sm text-danger">{error}</p>
  }
  // Only a real courier quote earns a strikethrough or a date. On the flat fallback both stay
  // undefined and the card renders exactly what it always has.
  const live = delivery?.source === 'live' ? delivery : null
  return (
    <OrderSummaryCard
      items={items}
      subtotal={quote?.subtotal ?? 0}
      discount={(quote?.productDiscount ?? 0) + (quote?.couponDiscount ?? 0)}
      shippingFee={quote?.shippingFee ?? 0}
      total={quote?.total ?? 0}
      fullShippingFee={live && quote?.shippingFee === 0 ? live.fullFee : undefined}
      deliveryNote={
        // The order does not exist yet, so the ETA counts from today rather than a createdAt.
        live && live.etaDays !== null ? `Delivery by ${formatDeliveryDate(new Date(), live.etaDays)}` : undefined
      }
    />
  )
}

function DeliveringTo({ address, newAddress }: { address: AddressItem | null; newAddress: AddressForm | null }) {
  const shown = address ?? newAddress
  if (!shown) return <p className="font-body text-sm text-muted-warm">No address selected.</p>
  return (
    <>
      <p className="font-body text-sm text-fg">{shown.name}</p>
      <p className="font-body text-sm text-muted-warm">
        {[shown.line1, shown.line2, shown.city, shown.state, shown.pincode].filter(Boolean).join(', ')}
      </p>
      <p className="font-body text-sm text-muted-warm">{shown.phone}</p>
    </>
  )
}

function PaymentTile({
  selected,
  onSelect,
  badge,
  title,
  subtitle,
  children,
}: {
  selected: boolean
  onSelect: () => void
  badge: string
  title: string
  subtitle: string
  children?: React.ReactNode
}) {
  return (
    <div className={`rounded-[10px] border-[1.5px] p-4 ${selected ? 'border-store-primary' : 'border-border'}`}>
      <label className="flex cursor-pointer items-center gap-3">
        <input type="radio" name="payment" checked={selected} onChange={onSelect} className="h-5 w-5 accent-store-primary" />
        <span className="flex h-7 w-10 shrink-0 items-center justify-center rounded bg-bg font-body text-[11px] font-bold text-fg">
          {badge}
        </span>
        <span>
          <span className="block font-body text-[15px] font-bold text-fg">{title}</span>
          <span className="block font-body text-xs text-muted-warm">{subtitle}</span>
        </span>
      </label>
      {selected && children}
    </div>
  )
}

function CouponField({
  cartLines,
  applied,
  onApplied,
  available,
}: {
  cartLines: CartLine[]
  applied: string | null
  onApplied: (code: string | null) => void
  available?: AvailableCoupon[]
}) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  async function apply(useCode?: string) {
    const target = useCode ?? code
    if (!target.trim()) return
    setChecking(true)
    setError('')
    const result = await validateCouponAction(target, cartLines)
    setChecking(false)
    if ('error' in result) {
      setError(result.error)
      return
    }
    onApplied(result.code)
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <h3 className="mb-2.5 font-heading text-sm font-bold text-fg">Have a coupon?</h3>
      {!applied && available && available.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {available.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => { setCode(c.code); void apply(c.code) }}
              className="rounded-full border border-store-primary/30 bg-store-primary/5 px-2.5 py-1 font-body text-2xs font-semibold text-store-primary hover:bg-store-primary/10"
            >
              {c.code} — {c.type === 'percent' ? `${c.value}% off` : `₹${c.value} off`}
            </button>
          ))}
        </div>
      )}
      {applied ? (
        <div className="flex items-center justify-between">
          <p className="font-body text-xs font-medium text-success">{applied} applied</p>
          <button
            onClick={() => {
              onApplied(null)
              setCode('')
            }}
            className="font-body text-xs font-semibold text-muted-warm hover:text-fg"
          >
            Remove
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Enter coupon code"
              className="h-10 flex-1 rounded-lg border border-border px-3 font-body text-sm text-fg focus-visible:border-store-primary focus-visible:ring-0"
            />
            <Button
              onClick={() => void apply()}
              disabled={checking}
              className="h-10 shrink-0 rounded-lg bg-fg px-4 font-body text-sm font-semibold text-surface hover:opacity-90"
            >
              {checking ? '…' : 'Apply'}
            </Button>
          </div>
          {error && <p className="mt-2 font-body text-xs text-danger">{error}</p>}
        </>
      )}
    </div>
  )
}

type AddressFieldProps = {
  control: ReturnType<typeof useForm<AddressForm>>['control']
  name: keyof AddressForm
  label: string
  span?: boolean
  optional?: boolean
  digits?: number
}

function AddressField({ control, name, label, span, optional, digits }: AddressFieldProps) {
  return (
    <div className={span ? 'col-span-2' : undefined}>
      <label htmlFor={name} className="mb-1.5 block font-body text-[13px] font-bold text-fg">
        {label}
        {!optional && <span className="text-danger">*</span>}
      </label>
      <Controller
        control={control}
        name={name}
        render={({ field, fieldState }) => (
          <>
            <Input
              {...field}
              id={name}
              inputMode={digits ? 'numeric' : undefined}
              onChange={(e) => field.onChange(digits ? e.target.value.replace(/\D/g, '').slice(0, digits) : e.target.value)}
              className={fieldClass(!!fieldState.error)}
            />
            {fieldState.error ? <p className="mt-1 font-body text-xs text-danger">{fieldState.error.message}</p> : null}
          </>
        )}
      />
    </div>
  )
}

let razorpayScriptPromise: Promise<boolean> | null = null

function loadRazorpayScript(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true)
  razorpayScriptPromise ??= new Promise<boolean>((resolve) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
  return razorpayScriptPromise
}
