'use client'

import { useEffect, useState } from 'react'

/** Shared animated dialog shell — fades in + slides up on open, matching the pattern already used by order-details-modal / product editor. */
export function Dialog({
  open,
  onClose,
  children,
  className = '',
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) requestAnimationFrame(() => setVisible(true))
    else setVisible(false)
  }, [open])

  if (!open) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end bg-black/50 transition-opacity duration-200 md:items-center md:justify-center ${visible ? 'opacity-100' : 'opacity-0'}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={`flex w-full flex-col rounded-t-2xl bg-surface transition-transform duration-250 ease-out md:max-w-[480px] md:rounded-2xl ${
          visible ? 'translate-y-0 md:scale-100' : 'translate-y-full md:translate-y-0 md:scale-95'
        } ${className}`}
      >
        {children}
      </div>
    </div>
  )
}
