import { withTenant } from '@/lib/prisma'

export type AdminCustomer = {
  id: string
  name: string
  email: string | null
  phone: string | null
  orderCount: number
  totalSpent: number
  lastOrderAt: Date | null
  createdAt: Date
}

export async function listCustomersForAdmin(tenantId: string): Promise<AdminCustomer[]> {
  const customers = await withTenant(tenantId, (db) =>
    db.customer.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        orders: { select: { total: true, createdAt: true } },
      },
    })
  )

  return customers.map((customer) => {
    const orders = customer.orders
    const totalSpent = orders.reduce((sum, o) => sum + Number(o.total), 0)
    const lastOrderAt = orders.reduce<Date | null>((latest, o) => (!latest || o.createdAt > latest ? o.createdAt : latest), null)
    return {
      id: customer.id,
      name: customer.name ?? 'Guest',
      email: customer.email,
      phone: customer.phone,
      orderCount: orders.length,
      totalSpent,
      lastOrderAt,
      createdAt: customer.createdAt,
    }
  })
}
