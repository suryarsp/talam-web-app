import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SWRConfig } from 'swr'

const {
  mockGetQuote,
  mockGetAvailableCoupons,
  mockGetUpiQr,
  mockPlaceOrder,
  mockValidateCoupon,
  mockUploadProof,
  mockCreateRazorpayOrder,
  mockVerifyRazorpay,
} = vi.hoisted(() => ({
  mockGetQuote: vi.fn(),
  mockGetAvailableCoupons: vi.fn(async () => []),
  mockGetUpiQr: vi.fn(async () => ({ error: 'no upi' })),
  mockPlaceOrder: vi.fn(),
  mockValidateCoupon: vi.fn(),
  mockUploadProof: vi.fn(),
  mockCreateRazorpayOrder: vi.fn(),
  mockVerifyRazorpay: vi.fn(),
}))

vi.mock('./actions', () => ({
  getQuoteAction: mockGetQuote,
  getAvailableCouponsAction: mockGetAvailableCoupons,
  getUpiQrAction: mockGetUpiQr,
  placeOrderAction: mockPlaceOrder,
  validateCouponAction: mockValidateCoupon,
  uploadPaymentProofAction: mockUploadProof,
  createRazorpayOrderAction: mockCreateRazorpayOrder,
  verifyRazorpayPaymentAction: mockVerifyRazorpay,
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))

import { CheckoutClient } from './checkout-client'
import { StoreBaseProvider } from '@/components/store/store-context'
import { useCartStore } from '@/lib/store/cart'
import { formatDeliveryDate } from '@/lib/shipping/delivery-estimate'
import type { QuoteDelivery } from './actions'

const FLAT: QuoteDelivery = { fullFee: 99, source: 'flat', etaDays: null, codAvailable: null }

const SAVED_ADDRESS = {
  id: 'a1',
  label: 'Home',
  name: 'Priya',
  line1: '42 Bharathi Nagar',
  line2: null,
  city: 'Madurai',
  state: 'Tamil Nadu',
  pincode: '625001',
  phone: '9876543210',
  isDefault: true,
}

function quoteWith(shippingFee: number, delivery: QuoteDelivery) {
  return {
    quote: { subtotal: 1000, productDiscount: 0, couponDiscount: 0, shippingFee, total: 1000 + shippingFee },
    lines: [{ productId: 'p1', size: 'M', quantity: 1, unitPrice: 1000 }],
    delivery,
  }
}

function renderCheckout({ addresses = [SAVED_ADDRESS] } = {}) {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <StoreBaseProvider base="">
        <CheckoutClient
          storeName="Meena Silks"
          signedIn
          signedInPhone="+919876543210"
          signedInName="Priya"
          signedInEmail="priya@example.com"
          addresses={addresses}
          methods={{ upi: false, instamojo: false, razorpay: false, cod: true }}
        />
      </StoreBaseProvider>
    </SWRConfig>
  )
}

/** The summary card is rendered twice (mobile + desktop); assert against the first. */
async function summary() {
  const heading = (await screen.findAllByText('Order Summary'))[0]
  return heading.closest('div')!.parentElement as HTMLElement
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetAvailableCoupons.mockResolvedValue([])
  mockGetQuote.mockResolvedValue(quoteWith(99, FLAT))
  useCartStore.setState({
    items: [
      { productId: 'p1', name: 'Silk Saree', slug: 'silk-saree', price: 1000, image: '', tenantId: 't1', size: 'M', quantity: 1 },
    ],
  })
})

describe('CheckoutClient pincode threading', () => {
  it("prices the quote against the selected saved address's pincode", async () => {
    renderCheckout()

    await waitFor(() =>
      expect(mockGetQuote).toHaveBeenCalledWith([{ productId: 'p1', size: 'M', quantity: 1 }], undefined, '625001')
    )
  })

  it('re-prices the quote once a new pincode reaches six digits', async () => {
    const user = userEvent.setup()
    renderCheckout()
    await waitFor(() => expect(mockGetQuote).toHaveBeenCalled())

    await user.click(screen.getByLabelText('Use a new address'))
    await user.type(screen.getByLabelText(/Pincode/), '560001')

    await waitFor(() => expect(mockGetQuote).toHaveBeenCalledWith(expect.anything(), undefined, '560001'))
  })

  it('does not send a half-typed pincode to the courier', async () => {
    const user = userEvent.setup()
    renderCheckout({ addresses: [] })
    await waitFor(() => expect(mockGetQuote).toHaveBeenCalled())

    await user.type(screen.getByLabelText(/Pincode/), '5600')

    await waitFor(() => expect(mockGetQuote).toHaveBeenCalled())
    for (const call of mockGetQuote.mock.calls) expect(call[2]).toBeUndefined()
  })
})

describe('CheckoutClient delivery display', () => {
  it("strikes through the live rate the shopper no longer pays when delivery is free", async () => {
    mockGetQuote.mockResolvedValue(quoteWith(0, { fullFee: 79, source: 'live', etaDays: 4, codAvailable: true }))
    renderCheckout()

    const struck = (await screen.findAllByText('₹79'))[0]
    expect(struck.className).toContain('line-through')
    expect(within(await summary()).getByText('Free')).toBeInTheDocument()
  })

  it('shows the live rate plainly when the order does not qualify for free delivery', async () => {
    mockGetQuote.mockResolvedValue(quoteWith(79, { fullFee: 79, source: 'live', etaDays: 4, codAvailable: true }))
    renderCheckout()

    const shown = (await screen.findAllByText('₹79'))[0]
    expect(shown.className).not.toContain('line-through')
  })

  it("shows the courier's delivery date when it quotes an ETA", async () => {
    mockGetQuote.mockResolvedValue(quoteWith(79, { fullFee: 79, source: 'live', etaDays: 4, codAvailable: true }))
    renderCheckout()

    expect((await screen.findAllByText(`Delivery by ${formatDeliveryDate(new Date(), 4)}`)).length).toBeGreaterThan(0)
  })

  it('leaves the flat-fee summary exactly as it was — no strikethrough, no date', async () => {
    renderCheckout()

    expect(within(await summary()).getByText('₹99')).toBeInTheDocument()
    expect(document.querySelector('.line-through')).toBeNull()
    expect(screen.queryByText(/Delivery by/)).toBeNull()
  })

  it("replaces the generic '5–7 business days' reciprocity banner with the courier's real ETA once one is known", async () => {
    const user = userEvent.setup()
    mockGetQuote.mockResolvedValue(quoteWith(79, { fullFee: 79, source: 'live', etaDays: 4, codAvailable: true }))
    renderCheckout()

    await waitFor(() => expect(mockGetQuote).toHaveBeenCalled())
    await user.click(screen.getAllByRole('button', { name: 'Continue to Payment' })[0])

    expect(await screen.findByText(`Estimated delivery by ${formatDeliveryDate(new Date(), 4)}`)).toBeInTheDocument()
    expect(screen.queryByText('Estimated delivery in 5–7 business days')).toBeNull()
  })

  it("falls back to the generic delivery banner when no live ETA is known", async () => {
    const user = userEvent.setup()
    renderCheckout()

    await waitFor(() => expect(mockGetQuote).toHaveBeenCalled())
    await user.click(screen.getAllByRole('button', { name: 'Continue to Payment' })[0])

    expect(await screen.findByText('Estimated delivery in 5–7 business days')).toBeInTheDocument()
  })
})

describe('CheckoutClient unserviceable pincode', () => {
  const NOT_SERVICEABLE = "We can't currently deliver to this pincode."

  it('tells the shopper in the address step, above the fold', async () => {
    mockGetQuote.mockResolvedValue({ error: NOT_SERVICEABLE })
    renderCheckout()

    const addressCard = (await screen.findByText('Delivery Address')).closest('div') as HTMLElement
    expect(await within(addressCard).findByText(NOT_SERVICEABLE)).toBeInTheDocument()
  })

  it('blocks every way forward while the pincode cannot be delivered to', async () => {
    mockGetQuote.mockResolvedValue({ error: NOT_SERVICEABLE })
    renderCheckout()

    await waitFor(() => {
      const buttons = screen.getAllByRole('button', { name: 'Continue to Payment' })
      expect(buttons.length).toBeGreaterThan(0)
      for (const button of buttons) expect(button).toBeDisabled()
    })
  })

  it('leaves the way forward open for a serviceable pincode', async () => {
    mockGetQuote.mockResolvedValue(quoteWith(79, { fullFee: 79, source: 'live', etaDays: 4, codAvailable: true }))
    renderCheckout()

    await waitFor(() => expect(mockGetQuote).toHaveBeenCalled())
    for (const button of screen.getAllByRole('button', { name: 'Continue to Payment' })) {
      expect(button).not.toBeDisabled()
    }
  })

  it('blocks the place-order button when the re-quote fails at the payment step', async () => {
    const user = userEvent.setup()
    renderCheckout()
    await waitFor(() => expect(mockGetQuote).toHaveBeenCalled())

    await user.click(screen.getAllByRole('button', { name: 'Continue to Payment' })[0])
    expect(await screen.findByText('Pay on Delivery')).toBeInTheDocument()

    // A coupon re-prices the cart — and the re-quote discovers the item sold out meanwhile.
    mockValidateCoupon.mockResolvedValue({ code: 'DIWALI' })
    mockGetQuote.mockResolvedValue({ error: 'Silk Saree (M) is out of stock.' })
    await user.type(screen.getAllByPlaceholderText('Enter coupon code')[0], 'DIWALI')
    await user.click(screen.getAllByRole('button', { name: 'Apply' })[0])

    await waitFor(() => {
      for (const button of screen.getAllByRole('button', { name: 'Place Order' })) expect(button).toBeDisabled()
    })
  })
})
