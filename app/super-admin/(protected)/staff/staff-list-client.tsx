'use client'

import { useState, useTransition } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { AdminStaffRow } from '@/lib/data/admin-staff'
import { ROLE_LABEL, SECTION_LABEL, sectionsForRole } from '@/lib/data/admin-permissions'
import { formatDate } from '@/lib/utils'
import { inviteStaffAction, removeStaffAction } from '@/app/super-admin/actions'

const inviteStaffSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name.'),
  email: z.string().trim().min(1, 'Enter an email address.').email('Enter a valid email address.'),
  role: z.enum(['owner', 'support_agent', 'billing_manager', 'growth_analyst']),
})
type InviteStaffValues = z.infer<typeof inviteStaffSchema>

function sectionsText(role: AdminStaffRow['role']) {
  return sectionsForRole(role)
    .map((s) => SECTION_LABEL[s])
    .join(', ')
}

// Reaching this page at all already means full staff-management access — see
// requireSuperAdminSection('staff') in the server page — so no isOwner check here.
export function StaffListClient({ staff: initialStaff }: { staff: AdminStaffRow[] }) {
  const [staff, setStaff] = useState(initialStaff)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const form = useForm<InviteStaffValues>({
    resolver: zodResolver(inviteStaffSchema),
    defaultValues: { name: '', email: '', role: 'support_agent' },
  })
  const selectedRole = useWatch({ control: form.control, name: 'role' })

  async function onSubmit(values: InviteStaffValues) {
    setError(null)
    const result = await inviteStaffAction(values.email, values.name, values.role)
    if ('error' in result) {
      setError(result.error)
      return
    }
    form.reset()
    setDialogOpen(false)
  }

  function remove(row: AdminStaffRow) {
    if (!window.confirm(`Remove ${row.name} from staff? They will lose access to /super-admin immediately.`)) return

    setError(null)
    setRemovingId(row.id)
    startTransition(async () => {
      const result = await removeStaffAction(row.id)
      setRemovingId(null)
      if ('error' in result) {
        setError(result.error)
        return
      }
      setStaff((prev) => prev.filter((s) => s.id !== row.id))
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Platform Staff</h1>
        <Button onClick={() => setDialogOpen(true)}>Invite Staff</Button>
      </div>

      {error && !dialogOpen && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Access</TableHead>
              <TableHead>Added</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <p className="font-medium text-foreground">{row.name}</p>
                  <p className="text-xs text-muted-foreground">{row.email}</p>
                </TableCell>
                <TableCell>
                  <Badge variant={row.role === 'owner' ? 'secondary' : 'outline'}>{ROLE_LABEL[row.role]}</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{sectionsText(row.role)}</TableCell>
                <TableCell>{formatDate(row.addedAt)}</TableCell>
                <TableCell>{row.lastActiveAt ? formatDate(row.lastActiveAt) : '—'}</TableCell>
                <TableCell>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => remove(row)}
                    disabled={isPending && removingId === row.id}
                  >
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {staff.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                  No staff yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <div className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Invite Staff</h2>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="support_agent">{ROLE_LABEL.support_agent}</SelectItem>
                        <SelectItem value="billing_manager">{ROLE_LABEL.billing_manager}</SelectItem>
                        <SelectItem value="growth_analyst">{ROLE_LABEL.growth_analyst}</SelectItem>
                        <SelectItem value="owner">{ROLE_LABEL.owner}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Grants: {sectionsText(selectedRole)}</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
                  Send Invite
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </Dialog>
    </div>
  )
}
