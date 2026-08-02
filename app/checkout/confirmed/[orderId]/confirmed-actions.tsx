'use client'

import { useRouter } from 'next/navigation'
import { Clock, FileText, MessageCircle } from 'lucide-react'
import { StoreLink, useStoreHref } from '@/components/store/store-context'

/** Client-only because every button here either navigates or opens an external app. */
export function ConfirmedActions({
  orderId,
  orderCode,
  storeName,
  whatsappNumber,
}: {
  orderId: string
  orderCode: string
  storeName: string
  whatsappNumber: string | null
}) {
  const router = useRouter()
  const home = useStoreHref('/')

  const shareText = `I just ordered ${orderCode} from ${storeName}!`
  // wa.me with a number opens a chat with the store; without one it opens the share sheet.
  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(shareText)}`
    : `https://wa.me/?text=${encodeURIComponent(shareText)}`

  return (
    <div className="mt-5 flex flex-col gap-2.5">
      <StoreLink
        href={`/orders/${orderId}`}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-store-primary font-body text-sm font-bold text-surface hover:opacity-90"
      >
        <Clock className="h-4 w-4" /> Track My Order
      </StoreLink>
      <StoreLink
        href={`/orders/${orderId}/invoice`}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-border font-body text-sm font-semibold text-fg hover:bg-bg"
      >
        <FileText className="h-4 w-4" /> View Invoice
      </StoreLink>
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-[#25D366] font-body text-sm font-bold text-surface hover:opacity-90"
      >
        <MessageCircle className="h-4 w-4" /> Share on WhatsApp
      </a>
      <button
        onClick={() => router.push(home)}
        className="flex h-12 w-full items-center justify-center rounded-[10px] border-[1.5px] border-border font-body text-sm font-semibold text-fg hover:bg-bg"
      >
        Continue Shopping
      </button>
    </div>
  )
}
