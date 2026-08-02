import { describe, it, expect } from 'vitest'
import {
  checkCoupon,
  computeQuote,
  decrementStock,
  stockFor,
  type CouponRow,
  type QuoteLine,
} from './checkout-pricing'

const line = (over: Partial<QuoteLine> = {}): QuoteLine => ({
  productId: 'p1',
  size: 'M',
  quantity: 1,
  unitPrice: 1000,
  compareAtPrice: null,
  ...over,
})

const coupon = (over: Partial<CouponRow> = {}): CouponRow => ({
  type: 'percent',
  value: 10,
  minOrder: null,
  usesLimit: null,
  usesCount: 0,
  expiresAt: null,
  isActive: true,
  ...over,
})

describe('computeQuote', () => {
  it('charges the sale price and reports the MRP saving separately', () => {
    const quote = computeQuote({
      lines: [line({ unitPrice: 800, compareAtPrice: 1000, quantity: 2 })],
      shippingFee: 99,
      freeDeliveryAbove: null,
      coupon: null,
    })
    expect(quote.itemsTotal).toBe(1600)
    expect(quote.subtotal).toBe(2000)
    expect(quote.productDiscount).toBe(400)
    expect(quote.total).toBe(1699)
  })

  it('waives shipping once the payable amount clears the threshold', () => {
    const quote = computeQuote({
      lines: [line({ unitPrice: 1500 })],
      shippingFee: 99,
      freeDeliveryAbove: 999,
      coupon: null,
    })
    expect(quote.shippingFee).toBe(0)
    expect(quote.total).toBe(1500)
  })

  it('reinstates shipping when a coupon drops the order back under the threshold', () => {
    const quote = computeQuote({
      lines: [line({ unitPrice: 1000 })],
      shippingFee: 99,
      freeDeliveryAbove: 999,
      coupon: coupon({ type: 'fixed', value: 200 }),
    })
    expect(quote.couponDiscount).toBe(200)
    expect(quote.shippingFee).toBe(99)
    expect(quote.total).toBe(899)
  })

  it('never lets a fixed coupon discount more than the cart is worth', () => {
    const quote = computeQuote({
      lines: [line({ unitPrice: 300 })],
      shippingFee: 0,
      freeDeliveryAbove: null,
      coupon: coupon({ type: 'fixed', value: 5000 }),
    })
    expect(quote.couponDiscount).toBe(300)
    expect(quote.total).toBe(0)
  })

  it('applies percent coupons to the items total', () => {
    const quote = computeQuote({
      lines: [line({ unitPrice: 1000, quantity: 2 })],
      shippingFee: 0,
      freeDeliveryAbove: null,
      coupon: coupon({ type: 'percent', value: 25 }),
    })
    expect(quote.couponDiscount).toBe(500)
    expect(quote.total).toBe(1500)
  })

  it('rounds a percent coupon to whole rupees so totals never render as ₹1,889.1', () => {
    const quote = computeQuote({
      lines: [line({ unitPrice: 2099 })],
      shippingFee: 0,
      freeDeliveryAbove: null,
      coupon: coupon({ type: 'percent', value: 10 }),
    })
    expect(quote.couponDiscount).toBe(210)
    expect(Number.isInteger(quote.total)).toBe(true)
  })
})

describe('checkCoupon', () => {
  const now = new Date('2026-07-28T00:00:00Z')

  it('accepts a usable coupon', () => {
    expect(checkCoupon(coupon(), 1000, now)).toBeNull()
  })

  it('rejects an inactive coupon', () => {
    expect(checkCoupon(coupon({ isActive: false }), 1000, now)).toBe('inactive')
  })

  it('rejects an expired coupon', () => {
    expect(checkCoupon(coupon({ expiresAt: new Date('2026-07-27T00:00:00Z') }), 1000, now)).toBe('expired')
  })

  it('rejects a coupon that has hit its usage limit', () => {
    expect(checkCoupon(coupon({ usesLimit: 5, usesCount: 5 }), 1000, now)).toBe('exhausted')
  })

  it('rejects a coupon below its minimum order value', () => {
    expect(checkCoupon(coupon({ minOrder: 2000 }), 1000, now)).toBe('below_min_order')
  })

  it('accepts a coupon exactly at its minimum order value', () => {
    expect(checkCoupon(coupon({ minOrder: 1000 }), 1000, now)).toBeNull()
  })
})

describe('stock helpers', () => {
  it('reads and decrements the bucket for a given size', () => {
    const stock = { S: 2, M: 5 }
    expect(stockFor(stock, 'M')).toBe(5)
    expect(decrementStock(stock, 'M', 2)).toEqual({ S: 2, M: 3 })
  })

  it('treats a missing size bucket as zero stock', () => {
    expect(stockFor({ S: 2 }, 'XL')).toBe(0)
  })

  it('resolves a null size to the single bucket a sizeless product has', () => {
    const stock = { 'Free Size': 4 }
    expect(stockFor(stock, null)).toBe(4)
    expect(decrementStock(stock, null, 1)).toEqual({ 'Free Size': 3 })
  })

  it('totals every bucket when a null size is ambiguous', () => {
    expect(stockFor({ S: 2, M: 3 }, null)).toBe(5)
  })

  it('reports zero for an empty stock map', () => {
    expect(stockFor({}, 'M')).toBe(0)
    expect(stockFor(null, 'M')).toBe(0)
  })
})
