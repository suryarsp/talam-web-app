import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amountInRupees: number): string {
  return `₹${amountInRupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  })
}

// Plain helper (not a component/hook), so calling Date.now() here doesn't trip the
// react-hooks/purity rule the way an inline call inside a component body would.
export function daysUntil(d: Date | null): number | null {
  return d ? Math.ceil((d.getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : null
}
