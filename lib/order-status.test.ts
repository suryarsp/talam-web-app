import { describe, it, expect } from 'vitest'
import { ORDER_STATUS_LABEL, ORDER_TABS, matchesTab, timelineFor, isValidTransition, getAvailableActions } from './order-status'
import type { OrderStatus } from '@prisma/client'

const ALL: OrderStatus[] = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned']

describe('isValidTransition / getAvailableActions', () => {
  it('allows a delivered order to be marked returned', () => {
    expect(isValidTransition('delivered', 'returned')).toBe(true)
    expect(getAvailableActions('delivered')).toEqual(['returned'])
  })

  it('never allows skipping straight to returned from an earlier status', () => {
    for (const status of ['pending', 'confirmed', 'shipped'] as OrderStatus[]) {
      expect(isValidTransition(status, 'returned')).toBe(false)
    }
  })

  it('leaves returned itself terminal', () => {
    expect(getAvailableActions('returned')).toEqual([])
  })
})

describe('matchesTab', () => {
  it('puts every status under All', () => {
    expect(ALL.every((s) => matchesTab(s, 'All'))).toBe(true)
  })

  it('groups in-flight orders under Active', () => {
    expect(ALL.filter((s) => matchesTab(s, 'Active'))).toEqual(['pending', 'confirmed', 'shipped'])
  })

  it('files each terminal status under exactly one tab', () => {
    for (const status of ['delivered', 'cancelled', 'returned'] as OrderStatus[]) {
      const tabs = ORDER_TABS.filter((t) => t !== 'All' && matchesTab(status, t))
      expect(tabs).toHaveLength(1)
    }
  })
})

describe('timelineFor', () => {
  it('walks the happy path and marks how far the order has got', () => {
    expect(timelineFor('shipped')).toEqual({
      steps: ['pending', 'confirmed', 'shipped', 'delivered'],
      currentIndex: 2,
    })
  })

  it('ends a cancelled order at cancelled rather than continuing to delivered', () => {
    const { steps, currentIndex } = timelineFor('cancelled')
    expect(steps[currentIndex]).toBe('cancelled')
    expect(steps).not.toContain('shipped')
  })

  it('shows a return as delivered-then-returned', () => {
    expect(timelineFor('returned')).toEqual({ steps: ['delivered', 'returned'], currentIndex: 1 })
  })

  it('always lands on a step the current status can label', () => {
    for (const status of ALL) {
      const { steps, currentIndex } = timelineFor(status)
      expect(ORDER_STATUS_LABEL[steps[currentIndex]]).toBeTruthy()
    }
  })
})
