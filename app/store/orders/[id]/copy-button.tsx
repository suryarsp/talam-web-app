'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <button
      aria-label="Copy tracking number"
      onClick={() => {
        void navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className="text-muted-warm hover:text-fg"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}
