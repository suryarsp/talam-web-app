import type { AdminStaffRole } from '@prisma/client'
import { withSuperAdmin } from '@/lib/prisma'

export type AdminStaffRow = {
  id: string
  email: string
  name: string
  role: AdminStaffRole
  addedAt: Date
  lastActiveAt: Date | null
}

export async function getAdminStaff(): Promise<AdminStaffRow[]> {
  return withSuperAdmin((db) => db.adminStaff.findMany({ orderBy: { addedAt: 'asc' } }))
}

export async function isAdminStaffEmail(email: string): Promise<boolean> {
  const row = await withSuperAdmin((db) =>
    db.adminStaff.findUnique({ where: { email: email.toLowerCase() }, select: { id: true } })
  )
  return row !== null
}

export async function getAdminStaffRole(email: string): Promise<AdminStaffRole | null> {
  const row = await withSuperAdmin((db) =>
    db.adminStaff.findUnique({ where: { email: email.toLowerCase() }, select: { role: true } })
  )
  return row?.role ?? null
}

export async function addAdminStaff(email: string, name: string, role: AdminStaffRole): Promise<AdminStaffRow> {
  return withSuperAdmin((db) =>
    db.adminStaff.create({ data: { email: email.toLowerCase().trim(), name: name.trim(), role } })
  )
}

export async function removeAdminStaff(id: string): Promise<void> {
  await withSuperAdmin((db) => db.adminStaff.delete({ where: { id } }))
}

export async function touchAdminStaffLastActive(email: string): Promise<void> {
  await withSuperAdmin((db) =>
    db.adminStaff.updateMany({ where: { email: email.toLowerCase() }, data: { lastActiveAt: new Date() } })
  )
}
