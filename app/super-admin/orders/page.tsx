import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import { getFlaggedOrders } from '@/lib/data/super-admin'

export default async function FlaggedOrdersPage() {
  const orders = await getFlaggedOrders()

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-foreground">Flagged Orders</h1>
      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">No orders currently flagged for dispute.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>UTR</TableHead>
              <TableHead>Days Pending</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium text-foreground">{order.tenantName}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{order.id}</TableCell>
                <TableCell>{formatCurrency(order.total)}</TableCell>
                <TableCell>{order.paymentProvider ?? '—'}</TableCell>
                <TableCell>{order.utr ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={order.daysPending >= 3 ? 'destructive' : 'secondary'}>{order.daysPending}d</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
