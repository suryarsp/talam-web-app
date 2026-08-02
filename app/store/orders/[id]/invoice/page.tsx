import { notFound } from 'next/navigation'
import { requireAuth, requireTenant } from '@/lib/auth-guard'
import { getCustomerOrder } from '@/lib/data/storefront-orders'
import { getBranches, getTenantStorefront } from '@/lib/data/tenant'
import { ORDER_STATUS_LABEL } from '@/lib/order-status'
import { PrintButton } from './print-button'

export const dynamic = 'force-dynamic'

const PAYMENT_LABEL: Record<string, string> = {
  upi_manual: 'UPI',
  instamojo: 'Instamojo',
  razorpay: 'Razorpay',
}

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireAuth(`/orders/${id}/invoice`)
  const { tenantId } = await requireTenant()

  const [order, tenant, branches] = await Promise.all([
    getCustomerOrder(tenantId, user.id, id),
    getTenantStorefront(tenantId),
    getBranches(tenantId),
  ])
  if (!order || !tenant) notFound()

  const branch = branches[0]

  return (
    // print:* utilities strip the page chrome so Ctrl-P / "Save as PDF" produces a clean
    // invoice — no PDF library needed, the browser already knows how to make one.
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-8 sm:py-10 print:max-w-none print:px-0 print:py-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <h1 className="font-heading text-lg font-bold text-fg">Invoice {order.code}</h1>
        <PrintButton />
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 sm:p-8 print:rounded-none print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
          <div>
            <p className="font-heading text-xl font-bold text-fg">{tenant.name}</p>
            {branch?.address && (
              <p className="mt-1 max-w-xs font-body text-xs text-muted-warm">
                {[branch.address, branch.city].filter(Boolean).join(', ')}
              </p>
            )}
            {tenant.contactPhone && <p className="font-body text-xs text-muted-warm">{tenant.contactPhone}</p>}
            {tenant.contactEmail && <p className="font-body text-xs text-muted-warm">{tenant.contactEmail}</p>}
          </div>
          <div className="text-right">
            <p className="font-body text-[11px] uppercase tracking-[0.08em] text-muted-warm">Invoice</p>
            <p className="font-body text-sm font-bold text-fg">{order.code}</p>
            <p className="mt-1 font-body text-xs text-muted-warm">
              {order.createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <p className="font-body text-xs text-muted-warm">{ORDER_STATUS_LABEL[order.status]}</p>
          </div>
        </header>

        <section className="grid gap-6 border-b border-border py-5 sm:grid-cols-2">
          <div>
            <p className="mb-1 font-body text-[11px] font-bold uppercase tracking-[0.08em] text-muted-warm">Billed To</p>
            <p className="font-body text-sm text-fg">{order.address.name}</p>
            <p className="font-body text-xs text-muted-warm">
              {[order.address.line1, order.address.line2, order.address.city, order.address.state, order.address.pincode]
                .filter(Boolean)
                .join(', ')}
            </p>
            <p className="font-body text-xs text-muted-warm">{order.address.phone}</p>
          </div>
          <div className="sm:text-right">
            <p className="mb-1 font-body text-[11px] font-bold uppercase tracking-[0.08em] text-muted-warm">Payment</p>
            <p className="font-body text-sm text-fg">{PAYMENT_LABEL[order.paymentProvider ?? ''] ?? '—'}</p>
            <p className="font-body text-xs text-muted-warm">
              {order.paymentStatus === 'paid' ? 'Paid' : 'Payment pending'}
            </p>
          </div>
        </section>

        <table className="w-full border-b border-border py-5">
          <thead>
            <tr className="border-b border-border">
              <th className="py-2 text-left font-body text-[11px] font-semibold uppercase tracking-wide text-muted-warm">
                Item
              </th>
              <th className="py-2 text-right font-body text-[11px] font-semibold uppercase tracking-wide text-muted-warm">
                Qty
              </th>
              <th className="py-2 text-right font-body text-[11px] font-semibold uppercase tracking-wide text-muted-warm">
                Rate
              </th>
              <th className="py-2 text-right font-body text-[11px] font-semibold uppercase tracking-wide text-muted-warm">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b border-border last:border-b-0">
                <td className="py-3 font-body text-sm text-fg">
                  {item.productName}
                  {item.size && <span className="text-muted-warm"> ({item.size})</span>}
                </td>
                <td className="py-3 text-right font-body text-sm text-fg">{item.quantity}</td>
                <td className="py-3 text-right font-body text-sm text-fg">₹{item.unitPrice.toLocaleString('en-IN')}</td>
                <td className="py-3 text-right font-body text-sm text-fg">
                  ₹{(item.unitPrice * item.quantity).toLocaleString('en-IN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="ml-auto mt-5 max-w-xs space-y-1.5 font-body text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-warm">Items</dt>
            <dd className="text-fg">₹{order.itemsTotal.toLocaleString('en-IN')}</dd>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted-warm">Discount{order.discountCode ? ` (${order.discountCode})` : ''}</dt>
              <dd className="text-success">−₹{order.discount.toLocaleString('en-IN')}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted-warm">Delivery</dt>
            <dd className="text-fg">
              {order.shippingFee === 0 ? 'Free' : `₹${order.shippingFee.toLocaleString('en-IN')}`}
            </dd>
          </div>
          <div className="flex justify-between border-t border-border pt-2">
            <dt className="font-heading text-base font-bold text-fg">Total</dt>
            <dd className="font-heading text-base font-bold text-fg">₹{order.total.toLocaleString('en-IN')}</dd>
          </div>
        </dl>

        <p className="mt-8 border-t border-border pt-4 text-center font-body text-xs text-muted-warm">
          Thank you for shopping with {tenant.name}.
        </p>
      </div>
    </main>
  )
}
