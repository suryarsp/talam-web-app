import { describe, it, expect } from 'vitest'
import { sectionsForRole, canAccessSection, canVerifyRefund, type AdminSection } from './admin-permissions'

const ALL_SECTIONS: AdminSection[] = ['overview', 'orders', 'tenants', 'billing', 'growth', 'staff']

describe('sectionsForRole', () => {
  it('grants owner every section, including staff', () => {
    expect(sectionsForRole('owner')).toEqual(ALL_SECTIONS)
  })

  it('scopes support_agent to overview, orders, and tenants', () => {
    expect(sectionsForRole('support_agent')).toEqual(['overview', 'orders', 'tenants'])
  })

  it('scopes billing_manager to overview and billing', () => {
    expect(sectionsForRole('billing_manager')).toEqual(['overview', 'billing'])
  })

  it('scopes growth_analyst to overview, growth, and orders', () => {
    expect(sectionsForRole('growth_analyst')).toEqual(['overview', 'growth', 'orders'])
  })

  it('never grants staff access to a non-owner role', () => {
    for (const role of ['support_agent', 'billing_manager', 'growth_analyst'] as const) {
      expect(sectionsForRole(role)).not.toContain('staff')
    }
  })
})

describe('canAccessSection', () => {
  it('matches sectionsForRole for every role/section pair', () => {
    for (const role of ['owner', 'support_agent', 'billing_manager', 'growth_analyst'] as const) {
      const granted = sectionsForRole(role)
      for (const section of ALL_SECTIONS) {
        expect(canAccessSection(role, section)).toBe(granted.includes(section))
      }
    }
  })
})

describe('canVerifyRefund', () => {
  it('lets owner and support_agent sign off on a manual refund', () => {
    expect(canVerifyRefund('owner')).toBe(true)
    expect(canVerifyRefund('support_agent')).toBe(true)
  })

  it('refuses growth_analyst even though it can reach the orders section', () => {
    // Verifying a refund moves real money — a stricter gate than merely reading orders.
    expect(canAccessSection('growth_analyst', 'orders')).toBe(true)
    expect(canVerifyRefund('growth_analyst')).toBe(false)
  })

  it('refuses billing_manager', () => {
    expect(canVerifyRefund('billing_manager')).toBe(false)
  })
})
