import { describe, expect, it } from 'vitest'
import { DEFAULT_SHIPPING_CONFIG, normalizeShippingConfig } from './shipping-config'

describe('normalizeShippingConfig', () => {
  it('returns defaults for a tenant that has never configured shipping', () => {
    expect(normalizeShippingConfig(null)).toEqual(DEFAULT_SHIPPING_CONFIG)
    expect(normalizeShippingConfig(undefined)).toEqual(DEFAULT_SHIPPING_CONFIG)
    expect(normalizeShippingConfig({})).toEqual(DEFAULT_SHIPPING_CONFIG)
  })

  it('defaults to platform mode, which is what blocks shipping until a real account is connected', () => {
    expect(DEFAULT_SHIPPING_CONFIG.mode).toBe('platform')
  })

  it('merges a partial stored config onto the defaults', () => {
    expect(normalizeShippingConfig({ mode: 'connected', pickupLocation: 'Main Warehouse' })).toEqual({
      ...DEFAULT_SHIPPING_CONFIG,
      mode: 'connected',
      pickupLocation: 'Main Warehouse',
    })
  })

  it('preserves every stored field', () => {
    const stored = {
      provider: 'shiprocket',
      mode: 'connected',
      pickupLocation: 'Chennai Store',
      connectedAt: '2026-08-21T10:00:00.000Z',
      connectedBy: 'staff',
      requestedAt: '2026-08-20T09:00:00.000Z',
      lastError: null,
      pickupPincode: '600001',
      pickupPincodeCheckedAt: '2026-08-22T11:00:00.000Z',
    }
    expect(normalizeShippingConfig(stored)).toEqual(stored)
  })

  it('starts with no resolved pickup pincode, since it is only ever filled in by a lookup', () => {
    expect(DEFAULT_SHIPPING_CONFIG.pickupPincode).toBeNull()
    expect(DEFAULT_SHIPPING_CONFIG.pickupPincodeCheckedAt).toBeNull()
  })

  it('keeps a resolved pickup pincode and the time it was resolved', () => {
    const result = normalizeShippingConfig({
      pickupPincode: '600001',
      pickupPincodeCheckedAt: '2026-08-22T11:00:00.000Z',
    })
    expect(result.pickupPincode).toBe('600001')
    expect(result.pickupPincodeCheckedAt).toBe('2026-08-22T11:00:00.000Z')
  })

  it('coerces a non-string pickup pincode to null rather than trusting it', () => {
    // Shiprocket returns pin_code as a string, but a hand-edited row could hold the number
    // 600001 — which would be pasted straight into a query string as-is if we trusted it.
    expect(normalizeShippingConfig({ pickupPincode: 600001 }).pickupPincode).toBeNull()
  })

  it('drops unknown keys rather than passing them through', () => {
    const result = normalizeShippingConfig({ mode: 'connected', somethingElse: 'nope' })
    expect(result).not.toHaveProperty('somethingElse')
    expect(result.mode).toBe('connected')
  })

  it('falls back to platform for an unrecognised mode, so a bad value fails closed', () => {
    expect(normalizeShippingConfig({ mode: 'wat' }).mode).toBe('platform')
  })

  it('falls back to null for an unrecognised connectedBy', () => {
    expect(normalizeShippingConfig({ connectedBy: 'wat' }).connectedBy).toBeNull()
  })

  it('ignores a raw value that is not an object', () => {
    expect(normalizeShippingConfig('nonsense')).toEqual(DEFAULT_SHIPPING_CONFIG)
    expect(normalizeShippingConfig(42)).toEqual(DEFAULT_SHIPPING_CONFIG)
    expect(normalizeShippingConfig([])).toEqual(DEFAULT_SHIPPING_CONFIG)
  })

  it('coerces non-string values in string fields to null rather than trusting them', () => {
    expect(normalizeShippingConfig({ pickupLocation: 123 }).pickupLocation).toBeNull()
    expect(normalizeShippingConfig({ connectedAt: {} }).connectedAt).toBeNull()
  })

  it('does not mutate the raw input', () => {
    const raw = { mode: 'connected' }
    normalizeShippingConfig(raw)
    expect(raw).toEqual({ mode: 'connected' })
  })
})
