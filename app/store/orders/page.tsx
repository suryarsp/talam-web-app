import { requireAuth, requireTenant } from '@/lib/auth-guard'
import { listCustomerOrders } from '@/lib/data/storefront-orders'
import { getCustomerAccountSummary } from '@/lib/data/customer-account'
import { OrdersView } from './orders-view'

export const dynamic = 'force-dynamic'

export default async function OrdersPage() {
  const user = await requireAuth('/orders')
  const { tenantId } = await requireTenant()

  const [orders, summary] = await Promise.all([
    listCustomerOrders(tenantId, user.id),
    getCustomerAccountSummary(tenantId, user.id),
  ])

  return <OrdersView orders={orders} customerName={summary.name ?? user.email ?? 'Customer'} tenantId={tenantId} />
}
