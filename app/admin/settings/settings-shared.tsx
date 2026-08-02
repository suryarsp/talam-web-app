'use client'

import { useCallback, useState } from 'react'

/** Indian mobile numbers: 10 digits, starting 6-9 (the digits after the fixed +91 prefix shown in the UI). */
export function isValidIndianMobile(v: string): boolean {
  return /^[6-9]\d{9}$/.test(v.trim())
}

/** Mirrors the server-side check in settings/actions.ts updatePaymentsSettingsAction. */
export function isValidUpiId(v: string): boolean {
  return /^[\w.-]+@[\w.-]+$/.test(v.trim())
}

export function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex h-[26px] w-12 shrink-0 items-center rounded-full px-[2px] transition-colors ${checked ? 'bg-brand-primary' : 'bg-[#D1D5DB]'} ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
    >
      <div className={`size-[22px] rounded-full bg-surface shadow-sm transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0'}`} />
    </button>
  )
}

export function SectionLabel({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between border-b border-border-light pb-2">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-warm">{children}</p>
      {right}
    </div>
  )
}

/** Small transient "✓ Saved" flash shown after a field autosaves — shared across tabs. */
export function useSavedFlash(): [boolean, () => void] {
  const [saved, setSaved] = useState(false)
  const flash = useCallback(() => {
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }, [])
  return [saved, flash]
}
