'use client'

import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Copy, Loader2 } from 'lucide-react'

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { ShippingConfig } from '@/lib/shipping/shipping-config'
import {
  connectShippingAction,
  disconnectShippingAction,
  getShippingSettingsAction,
  requestShippingAssistAction,
} from './actions'
import { shippingConnectSchema, type ShippingConnectValues } from './shipping-schema'
import { SectionLabel } from './settings-shared'

// Deliberately avoids "shiprocket"/"kartrocket"/"sr"/"kr" in the path: Shiprocket's own
// webhook-URL field in its dashboard rejects URLs containing those strings.
const WEBHOOK_PATH = '/api/webhooks/delivery-status'

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Copy-to-clipboard for the tenant's webhook token, with a confirmation the click registered. */
function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <code className="bg-muted grow overflow-x-auto rounded-md px-3 py-2 font-mono text-xs">{value}</code>
        <Button type="button" variant="outline" size="icon" onClick={copy} aria-label={`Copy ${label}`}>
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
        </Button>
      </div>
    </div>
  )
}

/**
 * What the shop must paste into their *own* Shiprocket dashboard. Shiprocket has no API for
 * webhook config, so this is the one step Talam cannot do for them — but because the token
 * is per-tenant it is safe to show here, which is what keeps self-serve setup unassisted.
 */
function WebhookInstructions({ token }: { token: string }) {
  const url = typeof window === 'undefined' ? WEBHOOK_PATH : `${window.location.origin}${WEBHOOK_PATH}`

  return (
    <div className="flex flex-col gap-3">
      <SectionLabel>Finish setup in Shiprocket</SectionLabel>
      <p className="text-muted-foreground text-sm">
        So orders update to <strong>Delivered</strong> automatically, add this webhook in your Shiprocket
        dashboard under Settings → API → Webhooks.
      </p>
      <CopyField label="Webhook URL" value={url} />
      <CopyField label="Header value (x-shiprocket-token)" value={token} />
      <p className="text-muted-foreground text-xs">
        This token is unique to your store. Disconnecting issues a new one, which you&apos;ll need to paste
        in again.
      </p>
    </div>
  )
}

function ConnectForm({
  defaultPickupLocation,
  onConnected,
}: {
  defaultPickupLocation: string
  onConnected: () => void
}) {
  const [error, setError] = useState('')

  const form = useForm<ShippingConnectValues>({
    resolver: zodResolver(shippingConnectSchema),
    defaultValues: { email: '', password: '', pickupLocation: defaultPickupLocation },
  })

  async function onSubmit(values: ShippingConnectValues) {
    setError('')
    const result = await connectShippingAction(values.email, values.password, values.pickupLocation)
    if (result.error) {
      setError(result.error)
      return
    }
    form.reset({ email: '', password: '', pickupLocation: values.pickupLocation })
    onConnected()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="bg-muted rounded-md p-3 text-sm">
          <p className="font-medium">Don&apos;t use your main Shiprocket login here.</p>
          <p className="text-muted-foreground mt-1">
            In Shiprocket, go to Settings → API → Configure → Create an API user, and use that
            email and password instead. If you ever need to cut Talam off, you can delete that
            API user without touching your real account.
          </p>
        </div>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>API user email</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="off" placeholder="orders@yourshop.com" {...field} />
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
              <FormDescription>
                Stored encrypted and used only to create your shipments.
              </FormDescription>
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
                <Input placeholder="e.g. Main Store" {...field} />
              </FormControl>
              <FormDescription>
                Must match a pickup location you&apos;ve already added in Shiprocket.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}

        <Button type="submit" disabled={form.formState.isSubmitting} className="self-start">
          {form.formState.isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
          Connect Shiprocket
        </Button>
      </form>
    </Form>
  )
}

function AssistPanel({ onRequested }: { onRequested: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function request() {
    setBusy(true)
    setError('')
    const result = await requestShippingAssistAction()
    setBusy(false)
    if (result.error) {
      setError(result.error)
      return
    }
    onRequested()
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-sm">
        Don&apos;t have a Shiprocket account yet? Talam can walk you through signing up, KYC and GST, then
        set it up for you.
      </p>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <Button type="button" variant="outline" onClick={request} disabled={busy} className="self-start">
        {busy && <Loader2 className="animate-spin" aria-hidden />}
        Let Talam set this up for me
      </Button>
    </div>
  )
}

function AssistRequestedPanel({ onSelfServe }: { onSelfServe: () => void }) {
  return (
    <div className="flex flex-col gap-3">
      <Badge variant="secondary" className="self-start">
        Talam is on it
      </Badge>
      <p className="text-muted-foreground text-sm">
        We&apos;ve got your request — someone from Talam will reach out by phone or WhatsApp to help you set
        up Shiprocket. You can keep taking orders in the meantime; you just can&apos;t ship through Talam
        until this is connected.
      </p>
      <Button type="button" variant="link" onClick={onSelfServe} className="h-auto self-start p-0">
        I&apos;ll do it myself instead
      </Button>
    </div>
  )
}

function ConnectedPanel({
  config,
  webhookToken,
  onDisconnected,
}: {
  config: ShippingConfig
  webhookToken: string | null
  onDisconnected: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  async function disconnect() {
    setBusy(true)
    await disconnectShippingAction()
    setBusy(false)
    setConfirming(false)
    onDisconnected()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Badge className="self-start">Connected</Badge>
        <p className="text-muted-foreground text-sm">
          Shipments go out through your own Shiprocket account
          {config.connectedAt && ` — connected ${formatDate(config.connectedAt)}`}
          {config.connectedBy === 'staff' && ' by Talam support'}.
        </p>
        {config.pickupLocation && (
          <p className="text-muted-foreground text-sm">
            Pickup location: <strong>{config.pickupLocation}</strong>
          </p>
        )}
      </div>

      {webhookToken && (
        <>
          <Separator />
          <WebhookInstructions token={webhookToken} />
        </>
      )}

      <Separator />

      <div className="flex flex-col gap-2">
        <SectionLabel>Disconnect</SectionLabel>
        <p className="text-muted-foreground text-sm">
          Removes your stored credentials. You won&apos;t be able to ship orders until you reconnect.
        </p>
        {confirming ? (
          <div className="flex gap-2">
            <Button type="button" variant="destructive" onClick={disconnect} disabled={busy}>
              {busy && <Loader2 className="animate-spin" aria-hidden />}
              Yes, disconnect
            </Button>
            <Button type="button" variant="outline" onClick={() => setConfirming(false)} disabled={busy}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button type="button" variant="outline" onClick={() => setConfirming(true)} className="self-start">
            Disconnect Shiprocket
          </Button>
        )}
      </div>
    </div>
  )
}

export function ShippingTab() {
  const [config, setConfig] = useState<ShippingConfig | null>(null)
  const [webhookToken, setWebhookToken] = useState<string | null>(null)
  // Lets a tenant who asked for help change their mind without clearing the request.
  const [forceSelfServe, setForceSelfServe] = useState(false)

  const load = useCallback(async () => {
    const result = await getShippingSettingsAction()
    setConfig(result.config)
    setWebhookToken(result.webhookToken)
  }, [])

  useEffect(() => {
    getShippingSettingsAction().then((result) => {
      setConfig(result.config)
      setWebhookToken(result.webhookToken)
    })
  }, [])

  if (!config) {
    return (
      <p className="text-muted-foreground text-sm" role="status">
        Loading shipping settings…
      </p>
    )
  }

  const awaitingAssist = config.mode === 'assist_requested' || config.mode === 'assist_in_progress'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <SectionLabel>Shiprocket</SectionLabel>
        <p className="text-muted-foreground text-sm">
          Connect your own Shiprocket account so deliveries, COD payouts and returns stay in your name.
        </p>
      </div>

      {config.mode === 'connected' ? (
        <ConnectedPanel
          config={config}
          webhookToken={webhookToken}
          onDisconnected={() => {
            setForceSelfServe(false)
            void load()
          }}
        />
      ) : awaitingAssist && !forceSelfServe ? (
        <AssistRequestedPanel onSelfServe={() => setForceSelfServe(true)} />
      ) : (
        <div className="flex flex-col gap-6">
          {config.lastError && (
            <p role="alert" className="text-destructive text-sm">
              We couldn&apos;t reach your Shiprocket account — it may have been disconnected or the password
              changed. Reconnect below to keep shipping.
            </p>
          )}
          <ConnectForm defaultPickupLocation={config.pickupLocation ?? ''} onConnected={() => void load()} />
          {!awaitingAssist && (
            <>
              <Separator />
              <AssistPanel onRequested={() => void load()} />
            </>
          )}
        </div>
      )}
    </div>
  )
}
