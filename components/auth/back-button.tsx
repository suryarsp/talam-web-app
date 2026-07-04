'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export function BackButton() {
  const router = useRouter()

  return (
    <button
      type="button"
      aria-label="Go back"
      onClick={() => router.back()}
      className="flex items-center justify-center shrink-0 rounded-lg size-10"
    >
      <ArrowLeft className="size-[18px] text-fg" strokeWidth={2} />
    </button>
  )
}
