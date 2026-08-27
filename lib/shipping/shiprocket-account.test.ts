import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockDb, mockWithTenant, mockLogin, MockShiprocketLoginError } = vi.hoisted(() => {
  const db = {
    tenant: { findUnique: vi.fn(), update: vi.fn() },
    shippingCredential: { upsert: vi.fn(), findUnique: vi.fn(), deleteMany: vi.fn() },
  }
  class MockShiprocketLoginError extends Error {
    status: number
    constructor(status: number, body: string) {
      super(`Shiprocket login failed (${status}): ${body}`)
      this.status = status
    }
  }
  return {
    mockDb: db,
    mockWithTenant: vi.fn(async (_tenantId: string, fn: (d: typeof db) => unknown) => fn(db)),
    mockLogin: vi.fn(),
    MockShiprocketLoginError,
  }
})

vi.mock('@/lib/prisma', () => ({ withTenant: mockWithTenant }))
vi.mock('./shiprocket-client', () => ({
  shiprocketLogin: mockLogin,
  ShiprocketLoginError: MockShiprocketLoginError,
}))

import { encrypt } from '@/lib/crypto'
import {
  connectShiprocketAccount,
  disconnectShiprocketAccount,
  getDecryptedShiprocketCredential,
  getShippingConfig,
  getShippingWebhookToken,
  markShiprocketCredentialStale,
  requestShiprocketAssist,
  saveResolvedPickupPincode,
} from './shiprocket-account'

const originalEnv = { ...process.env }

const VALID = {
  tenantId: 't1',
  email: 'shop@example.com',
  password: 'pw',
  pickupLocation: 'Chennai Store',
  actor: 'self' as const,
}

/** What db.tenant.update was called with for shippingConfig. */
function writtenConfig() {
  return mockDb.tenant.update.mock.calls[0][0].data.shippingConfig
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.SHIPPING_CREDENTIALS_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64')
  mockDb.tenant.findUnique.mockResolvedValue({ shippingConfig: null })
  mockLogin.mockResolvedValue('sr_token')
})

afterEach(() => {
  process.env = { ...originalEnv }
})

describe('connectShiprocketAccount — validation', () => {
  it.each([
    ['a blank email', { email: '  ' }, /email/i],
    ['a malformed email', { email: 'not-an-email' }, /valid email/i],
    ['a blank password', { password: '' }, /password/i],
    ['a blank pickup location', { pickupLocation: '   ' }, /pickup location/i],
  ])('rejects %s without calling Shiprocket', async (_label, override, expected) => {
    const result = await connectShiprocketAccount({ ...VALID, ...override })

    expect(result.error).toMatch(expected)
    expect(mockLogin).not.toHaveBeenCalled()
    expect(mockWithTenant).not.toHaveBeenCalled()
  })

  it('rejects an over-long pickup location', async () => {
    const result = await connectShiprocketAccount({ ...VALID, pickupLocation: 'x'.repeat(101) })
    expect(result.error).toBeTruthy()
    expect(mockLogin).not.toHaveBeenCalled()
  })
})

describe('connectShiprocketAccount — verifying against Shiprocket', () => {
  it('verifies the credentials by really logging in', async () => {
    await connectShiprocketAccount(VALID)
    expect(mockLogin).toHaveBeenCalledWith('shop@example.com', 'pw')
  })

  it('logs in before opening the transaction, never inside it', async () => {
    // The pool is max:1 in production and withTenant is a $transaction — a network
    // round-trip inside it would pin the only connection and risk a transaction timeout.
    const order: string[] = []
    mockLogin.mockImplementation(async () => {
      order.push('login')
      return 'sr_token'
    })
    mockWithTenant.mockImplementation(async (_t: string, fn: (d: typeof mockDb) => unknown) => {
      order.push('transaction')
      return fn(mockDb)
    })

    await connectShiprocketAccount(VALID)

    expect(order).toEqual(['login', 'transaction'])
  })

  it('returns the credentials error and writes nothing on an actual 401/403 rejection', async () => {
    mockLogin.mockRejectedValue(new MockShiprocketLoginError(403, 'invalid credentials'))

    const result = await connectShiprocketAccount(VALID)

    expect(result.error).toBe(
      'Could not verify that Shiprocket login — double-check the email and password and try again.'
    )
    expect(result.error).not.toMatch(/403/)
    expect(mockWithTenant).not.toHaveBeenCalled()
  })

  it('returns a distinct "try again" error for a non-credentials failure, not the wrong-password message', async () => {
    // A 5xx, a rate limit, or a bare network error must not be reported to the tenant as
    // "your password is wrong" — that's the exact bug: correct credentials getting rejected
    // by an unrelated upstream hiccup and mislabeled.
    mockLogin.mockRejectedValue(new MockShiprocketLoginError(429, 'rate limited'))

    const result = await connectShiprocketAccount(VALID)

    expect(result.error).toBeTruthy()
    expect(result.error).not.toBe(
      'Could not verify that Shiprocket login — double-check the email and password and try again.'
    )
    expect(mockWithTenant).not.toHaveBeenCalled()
  })

  it('also treats a plain network/unknown error as unavailable, not bad credentials', async () => {
    mockLogin.mockRejectedValue(new Error('fetch failed'))

    const result = await connectShiprocketAccount(VALID)

    expect(result.error).not.toBe(
      'Could not verify that Shiprocket login — double-check the email and password and try again.'
    )
  })
})

describe('connectShiprocketAccount — persistence', () => {
  it('stores both credentials encrypted, never in plaintext', async () => {
    await connectShiprocketAccount(VALID)

    const { create } = mockDb.shippingCredential.upsert.mock.calls[0][0]
    expect(create.emailCipher).toMatch(/^v1:/)
    expect(create.passwordCipher).toMatch(/^v1:/)
    expect(create.emailCipher).not.toContain('shop@example.com')
    expect(create.passwordCipher).not.toContain('pw')
  })

  it('generates a webhook token on create but leaves an existing one alone on update', async () => {
    await connectShiprocketAccount(VALID)

    const { create, update } = mockDb.shippingCredential.upsert.mock.calls[0][0]
    expect(create.webhookToken).toEqual(expect.any(String))
    expect(create.webhookToken.length).toBeGreaterThan(20)
    // Staff re-entering a corrected password must not invalidate a token the tenant has
    // already pasted into their Shiprocket dashboard.
    expect(update).not.toHaveProperty('webhookToken')
  })

  it('marks the tenant connected and records who did it', async () => {
    await connectShiprocketAccount({ ...VALID, actor: 'staff' })

    expect(writtenConfig()).toMatchObject({
      mode: 'connected',
      pickupLocation: 'Chennai Store',
      connectedBy: 'staff',
      connectedAt: expect.any(String),
      lastError: null,
    })
  })

  it('clears a previous error and preserves unrelated stored config', async () => {
    mockDb.tenant.findUnique.mockResolvedValue({
      shippingConfig: { mode: 'platform', lastError: 'went stale', requestedAt: '2026-08-01T00:00:00.000Z' },
    })

    await connectShiprocketAccount(VALID)

    expect(writtenConfig().lastError).toBeNull()
    expect(writtenConfig().requestedAt).toBe('2026-08-01T00:00:00.000Z')
  })

  it('trims the pickup location', async () => {
    await connectShiprocketAccount({ ...VALID, pickupLocation: '  Chennai Store  ' })
    expect(writtenConfig().pickupLocation).toBe('Chennai Store')
  })

  it('writes the credential and the config in a single transaction', async () => {
    await connectShiprocketAccount(VALID)

    expect(mockWithTenant).toHaveBeenCalledTimes(1)
    expect(mockDb.shippingCredential.upsert).toHaveBeenCalledTimes(1)
    expect(mockDb.tenant.update).toHaveBeenCalledTimes(1)
  })

  it('returns no error on success', async () => {
    expect(await connectShiprocketAccount(VALID)).toEqual({})
  })
})

describe('disconnectShiprocketAccount', () => {
  beforeEach(() => {
    mockDb.tenant.findUnique.mockResolvedValue({
      shippingConfig: { mode: 'connected', pickupLocation: 'Chennai Store', connectedBy: 'self' },
    })
  })

  it('deletes the credential and resets the tenant to platform mode', async () => {
    await disconnectShiprocketAccount('t1')

    expect(mockDb.shippingCredential.deleteMany).toHaveBeenCalledWith({ where: { tenantId: 't1' } })
    expect(writtenConfig()).toMatchObject({ mode: 'platform', connectedAt: null, connectedBy: null })
  })

  it('keeps the pickup location as a prefill for reconnecting', async () => {
    await disconnectShiprocketAccount('t1')
    expect(writtenConfig().pickupLocation).toBe('Chennai Store')
  })

  it('does both writes in one transaction', async () => {
    await disconnectShiprocketAccount('t1')
    expect(mockWithTenant).toHaveBeenCalledTimes(1)
  })
})

describe('requestShiprocketAssist', () => {
  it('flags the tenant and timestamps the request', async () => {
    const result = await requestShiprocketAssist('t1')

    expect(result).toEqual({})
    expect(writtenConfig()).toMatchObject({
      mode: 'assist_requested',
      requestedAt: expect.any(String),
    })
  })

  it.each(['assist_requested', 'assist_in_progress'])(
    'is a no-op when already %s, so repeat clicks do not re-notify staff',
    async (mode) => {
      mockDb.tenant.findUnique.mockResolvedValue({ shippingConfig: { mode } })

      const result = await requestShiprocketAssist('t1')

      expect(result).toEqual({})
      expect(mockDb.tenant.update).not.toHaveBeenCalled()
    }
  )

  it('refuses when an account is already connected', async () => {
    mockDb.tenant.findUnique.mockResolvedValue({ shippingConfig: { mode: 'connected' } })

    const result = await requestShiprocketAssist('t1')

    expect(result.error).toBeTruthy()
    expect(mockDb.tenant.update).not.toHaveBeenCalled()
  })
})

describe('markShiprocketCredentialStale', () => {
  it('sends the tenant back to platform mode with the reason recorded', async () => {
    mockDb.tenant.findUnique.mockResolvedValue({
      shippingConfig: { mode: 'connected', pickupLocation: 'Chennai Store' },
    })

    await markShiprocketCredentialStale('t1', 'Shiprocket login failed (403)')

    expect(writtenConfig()).toMatchObject({
      mode: 'platform',
      lastError: 'Shiprocket login failed (403)',
      pickupLocation: 'Chennai Store',
    })
  })
})

describe('saveResolvedPickupPincode', () => {
  it('records the resolved pincode and when it was resolved', async () => {
    mockDb.tenant.findUnique.mockResolvedValue({
      shippingConfig: { mode: 'connected', pickupLocation: 'Chennai Store' },
    })

    await saveResolvedPickupPincode('t1', '600001')

    const written = writtenConfig()
    expect(written.pickupPincode).toBe('600001')
    expect(Date.parse(written.pickupPincodeCheckedAt)).not.toBeNaN()
  })

  it('leaves the rest of the shipping config untouched', async () => {
    // This runs on a shopper's pincode lookup, so clobbering `mode` here would silently
    // disconnect a working Shiprocket account mid-checkout.
    mockDb.tenant.findUnique.mockResolvedValue({
      shippingConfig: {
        mode: 'connected',
        pickupLocation: 'Chennai Store',
        connectedAt: '2026-08-21T10:00:00.000Z',
        connectedBy: 'staff',
      },
    })

    await saveResolvedPickupPincode('t1', '600001')

    expect(writtenConfig()).toMatchObject({
      mode: 'connected',
      pickupLocation: 'Chennai Store',
      connectedAt: '2026-08-21T10:00:00.000Z',
      connectedBy: 'staff',
    })
  })
})

describe('getDecryptedShiprocketCredential', () => {
  it('returns null when the tenant has no stored credential', async () => {
    mockDb.shippingCredential.findUnique.mockResolvedValue(null)
    expect(await getDecryptedShiprocketCredential('t1')).toBeNull()
  })

  it('round-trips the stored ciphertext back to usable credentials', async () => {
    mockDb.shippingCredential.findUnique.mockResolvedValue({
      emailCipher: encrypt('shop@example.com'),
      passwordCipher: encrypt('pw'),
    })

    expect(await getDecryptedShiprocketCredential('t1')).toEqual({
      email: 'shop@example.com',
      password: 'pw',
    })
  })
})

describe('getShippingConfig / getShippingWebhookToken', () => {
  it('normalizes a missing config into defaults', async () => {
    mockDb.tenant.findUnique.mockResolvedValue({ shippingConfig: null })
    expect(await getShippingConfig('t1')).toMatchObject({ mode: 'platform' })
  })

  it('returns defaults when the tenant row is missing entirely', async () => {
    mockDb.tenant.findUnique.mockResolvedValue(null)
    expect(await getShippingConfig('t1')).toMatchObject({ mode: 'platform' })
  })

  it('returns the webhook token, or null when not connected', async () => {
    mockDb.shippingCredential.findUnique.mockResolvedValue({ webhookToken: 'whtok_abc' })
    expect(await getShippingWebhookToken('t1')).toBe('whtok_abc')

    mockDb.shippingCredential.findUnique.mockResolvedValue(null)
    expect(await getShippingWebhookToken('t1')).toBeNull()
  })
})
