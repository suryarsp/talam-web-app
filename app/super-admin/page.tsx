import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { getAllTenants } from '@/lib/data/super-admin'

const STAGE_LABEL: Record<string, string> = {
  business_setup: 'Business Setup',
  license: 'License',
  razorpay: 'Razorpay',
  store_live: 'Store Live',
}

const STATUS_LABEL: Record<string, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  blocked: 'Blocked',
  done: 'Done',
}

export default async function SuperAdminTenantsPage() {
  const tenants = await getAllTenants()

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-foreground">Tenants</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Onboarding Stage</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Razorpay</TableHead>
            <TableHead>Suspended</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tenants.map((tenant) => (
            <TableRow key={tenant.id}>
              <TableCell>
                <Link href={`/super-admin/tenants/${tenant.id}`} className="font-medium text-foreground hover:underline">
                  {tenant.name}
                </Link>
                <p className="text-xs text-muted-foreground">{tenant.slug}</p>
              </TableCell>
              <TableCell>{tenant.onboardingStage ? STAGE_LABEL[tenant.onboardingStage] : '—'}</TableCell>
              <TableCell>
                <Badge variant={tenant.onboardingStageStatus === 'blocked' ? 'destructive' : 'secondary'}>
                  {tenant.onboardingStageStatus ? STATUS_LABEL[tenant.onboardingStageStatus] : '—'}
                </Badge>
              </TableCell>
              <TableCell>{tenant.razorpayStatus ?? '—'}</TableCell>
              <TableCell>
                {tenant.suspendedAt ? <Badge variant="destructive">Suspended</Badge> : <span className="text-muted-foreground">—</span>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
