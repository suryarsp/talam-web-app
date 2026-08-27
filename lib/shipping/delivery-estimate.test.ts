import { describe, expect, it } from 'vitest'
import { formatDeliveryDate } from './delivery-estimate'

// Noon UTC keeps every assertion on the same calendar day regardless of the runner's timezone.
const PLACED = new Date('2026-09-01T12:00:00Z')

describe('formatDeliveryDate', () => {
  it('adds the courier ETA to the day the order was placed', () => {
    expect(formatDeliveryDate(PLACED, 3)).toBe('Fri, 4 Sept')
  })

  it('rolls into the next month when the ETA runs past the month end', () => {
    expect(formatDeliveryDate(new Date('2026-09-29T12:00:00Z'), 3)).toBe('Fri, 2 Oct')
  })

  it('reads as the same day when the courier quotes zero days', () => {
    expect(formatDeliveryDate(PLACED, 0)).toBe('Tue, 1 Sept')
  })
})
