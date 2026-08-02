import { describe, it, expect } from 'vitest'
import { buildUpiIntent, isValidVpa } from './upi'

describe('buildUpiIntent', () => {
  it('encodes the payee, amount and currency a UPI app expects', () => {
    const intent = buildUpiIntent({ vpa: 'meenasilks@okhdfc', storeName: 'Meena Silks', amount: 2499, note: 'Order 1' })
    const params = new URLSearchParams(intent.replace('upi://pay?', ''))

    expect(intent.startsWith('upi://pay?')).toBe(true)
    expect(params.get('pa')).toBe('meenasilks@okhdfc')
    expect(params.get('pn')).toBe('Meena Silks')
    expect(params.get('cu')).toBe('INR')
  })

  it('always writes the amount with two decimals — some apps reject anything else', () => {
    const params = (amount: number) =>
      new URLSearchParams(
        buildUpiIntent({ vpa: 'a@b', storeName: 'S', amount, note: 'n' }).replace('upi://pay?', '')
      ).get('am')

    expect(params(2499)).toBe('2499.00')
    expect(params(1234.5)).toBe('1234.50')
    expect(params(0)).toBe('0.00')
  })

  it('url-encodes store names with spaces and symbols', () => {
    const intent = buildUpiIntent({ vpa: 'a@b', storeName: 'Raj & Co', amount: 10, note: 'Order #1' })
    expect(intent).not.toContain(' ')
    expect(new URLSearchParams(intent.replace('upi://pay?', '')).get('pn')).toBe('Raj & Co')
  })
})

describe('isValidVpa', () => {
  it.each(['name@bank', 'meena.silks@okhdfc', 'a-b@ybl'])('accepts %s', (vpa) => {
    expect(isValidVpa(vpa)).toBe(true)
  })

  it.each(['nobank', '@bank', 'name@', 'name @bank'])('rejects %s', (vpa) => {
    expect(isValidVpa(vpa)).toBe(false)
  })
})
