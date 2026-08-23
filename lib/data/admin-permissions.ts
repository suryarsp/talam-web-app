import type { AdminStaffRole } from '@prisma/client'

// No dependency on lib/prisma here on purpose: this file is imported by client components
// (e.g. staff-list-client.tsx) to render role/section labels. Pulling in Prisma's pg
// driver — Node-only (fs/net/tls) — breaks the browser bundle. Keep DB access in
// lib/data/admin-staff.ts and only pure lookups here.

export type AdminSection = 'overview' | 'orders' | 'tenants' | 'billing' | 'growth' | 'staff'

export const SECTION_LABEL: Record<AdminSection, string> = {
  overview: 'Overview',
  orders: 'Orders',
  tenants: 'Tenants',
  billing: 'Billing',
  growth: 'Growth',
  staff: 'Staff',
}

export const ROLE_LABEL: Record<AdminStaffRole, string> = {
  owner: 'Owner',
  support_agent: 'Support Agent',
  billing_manager: 'Billing Manager',
  growth_analyst: 'Growth Analyst',
}

// Single source of truth for what each role can reach — a plain map in code, not the DB,
// so tightening/loosening a role's scope is a one-line change with no migration.
const ROLE_SECTIONS: Record<AdminStaffRole, AdminSection[]> = {
  owner: ['overview', 'orders', 'tenants', 'billing', 'growth', 'staff'],
  support_agent: ['overview', 'orders', 'tenants'],
  billing_manager: ['overview', 'billing'],
  growth_analyst: ['overview', 'growth', 'orders'],
}

export function sectionsForRole(role: AdminStaffRole): AdminSection[] {
  return ROLE_SECTIONS[role]
}

export function canAccessSection(role: AdminStaffRole, section: AdminSection): boolean {
  return ROLE_SECTIONS[role].includes(section)
}
