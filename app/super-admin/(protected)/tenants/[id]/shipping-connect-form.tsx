'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { SuperAdminTenant } from '@/lib/data/super-admin'
import { shippingConnectSchema, type ShippingConnectValues } from '@/app/admin/settings/shipping-schema'
import { markShippingAssistInProgressAction, staffConnectShippingAction } from '@/app/super-admin/actions'

const MODE_LABEL: Record<SuperAdminTenant['shippingMode'], string> = {
  platform: 'not connected',
  assist_requested: 'help requested',
  assist_in_progress: 'we are on it',
  connected: 'connected',
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000))
}

/**
 * Staff-side of assisted onboarding: support enters the shop's Shiprocket credentials after
 * walking them through signup on the phone.
 *
 * Always visible, including once connected — a shop that misread its password over the
 * phone needs staff to be able to re-enter it. The webhook token survives that, so the shop
 * doesn't have to redo their Shiprocket dashboard config.
 */
export function ShippingConnectForm({ tenant }: { tenant: SuperAdminTenant }) {
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [claiming, setClaiming] = useState(false)

  const form = useForm<ShippingConnectValues>({
    resolver: zodResolver(shippingConnectSchema),
    defaultValues: { email: '', password: '', pickupLocation: '' },
  })

  async function onSubmit(values: ShippingConnectValues) {
    setError('')
    setDone(false)
    const result = await staffConnectShippingAction(
      tenant.id,
      values.email,
      values.password,
      values.pickupLocation
    )
    if ('error' in result) {
      setError(result.error)
      return
    }
    form.reset()
    setDone(true)
  }

  async function claim() {
    setClaiming(true)
    setError('')
    const result = await markShippingAssistInProgressAction(tenant.id)
    setClaiming(false)
    if ('error' in result) setError(result.error)
  }

  const waitingDays = daysSince(tenant.shippingRequestedAt)

  return (
    <section className="rounded-lg border border-border p-4">
      <h2 className="mb-3 text-sm font-semibold text-foreground">Shipping (Shiprocket)</h2>

      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <Badge variant={tenant.shippingMode === 'assist_requested' ? 'destructive' : 'secondary'}>
          {MODE_LABEL[tenant.shippingMode]}
        </Badge>
        {tenant.shippingMode === 'assist_requested' && waitingDays !== null && (
          <span className="text-muted-foreground">
            waiting {waitingDays} {waitingDays === 1 ? 'day' : 'days'}
          </span>
        )}
        {tenant.shippingMode === 'assist_requested' && (
          <Button variant="outline" size="sm" onClick={claim} disabled={claiming}>
            {claiming && <Loader2 className="animate-spin" aria-hidden />}
            I&apos;m handling this
          </Button>
        )}
      </div>

      <p className="text-muted-foreground mb-3 text-sm">
        Walk them through Shiprocket signup, then have them create an API user for Talam —
        Settings → API → Configure → Create an API user, a separate email and password from
        their main login. Never ask for their main Shiprocket password. Set the webhook up in
        their dashboard while you have them on the call — their token is shown in their
        Settings → Shipping tab once this form succeeds.
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex max-w-md flex-col gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>API user email</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="off" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>API user password</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="off" {...field} />
                </FormControl>
                <FormDescription>Encrypted before it is stored. Not the store&apos;s main login.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="pickupLocation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pickup location nickname</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {done && <p className="text-sm text-muted-foreground">Connected on the store&apos;s behalf.</p>}

          <Button type="submit" disabled={form.formState.isSubmitting} className="self-start">
            {form.formState.isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
            Connect on their behalf
          </Button>
        </form>
      </Form>
    </section>
  )
}
