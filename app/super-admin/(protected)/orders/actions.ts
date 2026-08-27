'use server'

import { revalidatePath } from 'next/cache'
import { requireSuperAdminSection } from '@/lib/auth-guard'
import { uploadImage } from '@/lib/cloudinary'
import { cancelOrder, submitRefundProof, confirmRefundVerification } from '@/lib/orders/cancellation'

/** Same shape as the lib/orders/cancellation.ts functions these wrap — an absent `error` is success. */
type ActionResult = { error?: string }

const ORDERS_PATH = '/super-admin/orders'

/**
 * Every refusal the flow can express already comes back as an `error` string from
 * lib/orders/cancellation.ts. This only catches what nothing planned for — a dropped
 * connection, a Cloudinary outage — so a server action never rejects at the client, where
 * the thrown message would be swallowed as a generic digest anyway.
 */
async function guarded(work: () => Promise<ActionResult>, fallback: string): Promise<ActionResult> {
  try {
    const result = await work()
    // Revalidate only on success: a refused cancellation changed nothing to re-render.
    if (!result.error) revalidatePath(ORDERS_PATH)
    return result
  } catch {
    return { error: fallback }
  }
}

export async function cancelOrderAction(tenantId: string, orderId: string, reason: string): Promise<ActionResult> {
  await requireSuperAdminSection('orders')
  return guarded(() => cancelOrder(tenantId, orderId, reason), 'Could not cancel this order. Please try again.')
}

export async function uploadRefundProofAction(
  tenantId: string,
  orderId: string,
  reason: string,
  file: File
): Promise<ActionResult> {
  await requireSuperAdminSection('orders')
  return guarded(async () => {
    // Upload first: a proof URL is only recorded once the image is actually stored, so a
    // failed upload leaves the order out of the verification queue rather than in it with
    // a dead link.
    const proofUrl = await uploadImage(file, `talam/${tenantId}/refund-proofs`)
    return submitRefundProof(tenantId, orderId, reason, proofUrl)
  }, 'Could not upload the refund screenshot. Please try again.')
}

export async function confirmRefundVerificationAction(tenantId: string, orderId: string): Promise<ActionResult> {
  const { user, role } = await requireSuperAdminSection('orders')
  return guarded(
    () => confirmRefundVerification(tenantId, orderId, { email: user.email!, role }),
    'Could not confirm this refund. Please try again.'
  )
}
