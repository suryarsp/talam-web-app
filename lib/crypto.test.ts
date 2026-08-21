import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { decrypt, encrypt, timingSafeEqualStr } from './crypto'

const originalEnv = { ...process.env }
const VALID_KEY = Buffer.alloc(32, 7).toString('base64')

beforeEach(() => {
  process.env.SHIPPING_CREDENTIALS_ENCRYPTION_KEY = VALID_KEY
})

afterEach(() => {
  process.env = { ...originalEnv }
})

describe('encrypt / decrypt', () => {
  it('round-trips a value exactly', () => {
    expect(decrypt(encrypt('shop@example.com'))).toBe('shop@example.com')
  })

  it('round-trips values with unicode and punctuation', () => {
    const secret = 'xXqXGBz23eV0X$If2!&rR^ünï©ode'
    expect(decrypt(encrypt(secret))).toBe(secret)
  })

  it('produces a v1-prefixed four-segment token', () => {
    const parts = encrypt('hello').split(':')
    expect(parts).toHaveLength(4)
    expect(parts[0]).toBe('v1')
  })

  it('produces different ciphertext for the same plaintext each time', () => {
    // Guards against anyone "simplifying" the random IV into a fixed one.
    expect(encrypt('same')).not.toBe(encrypt('same'))
  })

  it('throws when the ciphertext segment has been tampered with', () => {
    const [v, iv, tag, ct] = encrypt('hello').split(':')
    const flipped = Buffer.from(ct, 'base64')
    flipped[0] ^= 0xff
    expect(() => decrypt(`${v}:${iv}:${tag}:${flipped.toString('base64')}`)).toThrow()
  })

  it('throws when the auth tag has been tampered with', () => {
    const [v, iv, tag, ct] = encrypt('hello').split(':')
    const flipped = Buffer.from(tag, 'base64')
    flipped[0] ^= 0xff
    expect(() => decrypt(`${v}:${iv}:${flipped.toString('base64')}:${ct}`)).toThrow()
  })

  it('rejects a token without the v1 prefix', () => {
    const withoutPrefix = encrypt('hello').split(':').slice(1).join(':')
    expect(() => decrypt(withoutPrefix)).toThrow(/unrecognised encrypted value/i)
  })

  it('rejects a malformed token', () => {
    expect(() => decrypt('v1:only:three')).toThrow(/unrecognised encrypted value/i)
  })

  it('throws a clear error when the key is not configured', () => {
    delete process.env.SHIPPING_CREDENTIALS_ENCRYPTION_KEY
    expect(() => encrypt('hello')).toThrow('SHIPPING_CREDENTIALS_ENCRYPTION_KEY is not configured')
    expect(() => decrypt('v1:a:b:c')).toThrow('SHIPPING_CREDENTIALS_ENCRYPTION_KEY is not configured')
  })

  it('throws a clear error when the key is the wrong length', () => {
    process.env.SHIPPING_CREDENTIALS_ENCRYPTION_KEY = Buffer.alloc(16, 7).toString('base64')
    expect(() => encrypt('hello')).toThrow(
      'SHIPPING_CREDENTIALS_ENCRYPTION_KEY must be a base64-encoded 32-byte key'
    )
  })

  it('cannot decrypt a value encrypted under a different key', () => {
    const token = encrypt('hello')
    process.env.SHIPPING_CREDENTIALS_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString('base64')
    expect(() => decrypt(token)).toThrow()
  })
})

describe('timingSafeEqualStr', () => {
  it('accepts identical strings', () => {
    expect(timingSafeEqualStr('token-abc', 'token-abc')).toBe(true)
  })

  it('rejects different strings of equal length', () => {
    expect(timingSafeEqualStr('token-abc', 'token-xyz')).toBe(false)
  })

  it('rejects strings of differing length without throwing', () => {
    expect(timingSafeEqualStr('short', 'much-longer-value')).toBe(false)
  })

  it('rejects empty input on either side', () => {
    expect(timingSafeEqualStr('', '')).toBe(false)
    expect(timingSafeEqualStr('abc', '')).toBe(false)
  })
})
