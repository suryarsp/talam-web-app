import { getAdminStaff } from '@/lib/data/admin-staff'
import { requireSuperAdminSection } from '@/lib/auth-guard'
import { StaffListClient } from './staff-list-client'

export default async function SuperAdminStaffPage() {
  // Only 'owner' has 'staff' in its section list, so reaching this page at all already
  // means full staff-management access — no separate isOwner check needed past this.
  await requireSuperAdminSection('staff')
  const staff = await getAdminStaff()
  return <StaffListClient staff={staff} />
}
