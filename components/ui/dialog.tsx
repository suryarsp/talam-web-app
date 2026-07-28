'use client'

import { useEffect, useState } from 'react'

/** Shared animated dialog shell — fades in + slides up on open, matching the pattern already used by order-details-modal / product editor. */
export function Dialog({
  open,
  onClose,
  children,
  className = '',
  position = 'bottom',
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
  /** 'bottom' (default) slides up from the bottom on mobile; 'center' stays centered on all screens. */
  position?: 'bottom' | 'center'
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) requestAnimationFrame(() => setVisible(true))
    else queueMicrotask(() => setVisible(false))
  }, [open])

  if (!open) return null

  const centered = position === 'center'

  return (
    <div
      className={`fixed inset-0 z-50 flex ${centered ? 'items-center justify-center p-4' : 'items-end md:items-center md:justify-center'} bg-black/50 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={`flex w-full flex-col bg-surface transition-transform duration-250 ease-out md:max-w-[480px] ${
          centered ? 'rounded-2xl' : 'rounded-t-2xl md:rounded-2xl'
        } ${
          visible
            ? 'translate-y-0 md:scale-100'
            : centered
              ? 'scale-95'
              : 'translate-y-full md:translate-y-0 md:scale-95'
        } ${className}`}
      >
        {children}
      </div>
    </div>
  )
}
