'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { FlaggedOrder } from '@/lib/data/super-admin'
import { formatCurrency } from '@/lib/utils'
import { cancelOrderAction, uploadRefundProofAction } from './actions'

/**
 * Mirrors refundRouteFor() from lib/orders/cancellation.ts, which can't be imported here:
 * that module pulls in lib/prisma (Node-only pg driver) and would break the browser bundle.
 * Purely for choosing what this dialog offers — the server re-derives the same route and has
 * the final say, so a drift between the two shows up as a refusal, never a wrong refund.
 */
type RefundRoute = 'none' | 'razorpay' | 'manual'

function refundRoute(order: FlaggedOrder): RefundRoute {
  if (order.paymentStatus !== 'paid') return 'none'
  return order.paymentProvider === 'razorpay' ? 'razorpay' : 'manual'
}

const cancelSchema = z.object({
  reason: z.string().trim().min(1, 'Enter a reason for cancelling.'),
  proof: z.instanceof(File).optional(),
})

type CancelValues = z.infer<typeof cancelSchema>

/** The screenshot is required on the manual route only. Expressed as a refinement on one
 *  shared object schema rather than two schemas — a union of schema types loses the field
 *  inference react-hook-form needs for `control`. */
function schemaFor(route: RefundRoute) {
  return cancelSchema.refine((values) => route !== 'manual' || values.proof instanceof File, {
    path: ['proof'],
    message: 'Attach the UPI transfer screenshot.',
  })
}

const SUBMIT_LABEL: Record<RefundRoute, (total: number) => string> = {
  none: () => 'Cancel Order',
  razorpay: (total) => `Cancel & Refund ${formatCurrency(total)} via Razorpay`,
  manual: () => 'Submit for Verification',
}

export function CancelOrderDialog({ order }: { order: FlaggedOrder }) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const route = refundRoute(order)

  const form = useForm<CancelValues>({
    resolver: zodResolver(schemaFor(route)),
    defaultValues: { reason: '', proof: undefined },
  })

  function close() {
    setOpen(false)
    setError(null)
    form.reset()
  }

  async function onSubmit(values: CancelValues) {
    setError(null)
    const result =
      route === 'manual'
        ? await uploadRefundProofAction(order.tenantId, order.id, values.reason, values.proof!)
        : await cancelOrderAction(order.tenantId, order.id, values.reason)

    if (result.error) {
      setError(result.error)
      return
    }
    close()
  }

  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        Cancel
      </Button>

      <Dialog open={open} onClose={close} position="center">
        <div className="p-4">
          <h2 className="text-sm font-semibold text-foreground">Cancel order</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            {order.tenantName} · {formatCurrency(order.total)}
          </p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {route === 'manual' && (
                <FormField
                  control={form.control}
                  name="proof"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UPI transfer screenshot</FormLabel>
                      <FormControl>
                        {/* Spreading `field` would hand a File to `value`, which a file input
                            can't accept — so only the other bindings are wired up. */}
                        <Input
                          type="file"
                          accept="image/*"
                          name={field.name}
                          ref={field.ref}
                          onBlur={field.onBlur}
                          onChange={(e) => field.onChange(e.target.files?.[0])}
                        />
                      </FormControl>
                      <FormDescription>
                        This order was paid outside Razorpay — transfer the refund by UPI, then upload the proof. An
                        owner or support agent confirms it before the order is cancelled.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={close}>
                  Close
                </Button>
                <Button type="submit" variant="destructive" disabled={form.formState.isSubmitting}>
                  {SUBMIT_LABEL[route](order.total)}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </Dialog>
    </>
  )
}
