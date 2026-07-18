'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash, Info, X } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'

const mockAddresses = [
  { id: '1', label: 'Home', name: 'Priya Rajan', line1: '42, Bharathi Nagar, 2nd Cross Street', line2: 'Madurai, Tamil Nadu 625001', phone: '+91 98765 43210', isDefault: true },
  { id: '2', label: 'Office', name: 'Priya Rajan', line1: '3rd Floor, Tech Park, Anna Salai', line2: 'Chennai, Tamil Nadu 600002', phone: '+91 98765 43210', isDefault: false },
]

// ponytail: no PaymentMethod table or gateway tokenization exists yet — UPI ID is a safe,
// non-PCI identifier to store as-is. Card capture needs real tokenization before it's added.
type PaymentMethod = { id: string; upiId: string; isDefault: boolean }

export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-[26px] w-[46px] shrink-0 rounded-full transition-colors ${checked ? 'bg-success' : 'bg-border'}`}
    >
      <span className={`absolute top-[3px] size-5 rounded-full bg-surface shadow transition-transform ${checked ? 'left-[23px]' : 'left-[3px]'}`} />
    </button>
  )
}

export function AddressesContent() {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-body text-sm font-bold text-fg">Saved Addresses</h3>
        <button className="flex items-center gap-1.5 rounded-lg border border-store-primary px-3 py-1.5 font-body text-xs font-semibold text-store-primary hover:bg-store-primary/5">
          <Plus className="h-3.5 w-3.5" /> Add New Address
        </button>
      </div>
      <div className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 border border-amber-200">
        <Info className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
        <p className="font-body text-xs text-amber-800">One default address is required to place orders.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {mockAddresses.map(addr => (
          <div key={addr.id} className="rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-body text-sm font-bold text-fg">{addr.label}</span>
              {addr.isDefault && (
                <span className="rounded-full bg-success/10 px-2 py-0.5 font-body text-[10px] font-bold text-success uppercase tracking-wide">Default</span>
              )}
            </div>
            <p className="font-body text-sm text-fg">{addr.name}</p>
            <p className="font-body text-xs text-muted-warm mt-0.5">{addr.line1}</p>
            <p className="font-body text-xs text-muted-warm">{addr.line2}</p>
            <p className="font-body text-xs text-muted-warm mt-1">{addr.phone}</p>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
              <button className="flex items-center gap-1 font-body text-xs font-medium text-store-primary hover:underline">
                <Pencil className="h-3 w-3" /> Edit
              </button>
              <span className="text-border">·</span>
              <button className="flex items-center gap-1 font-body text-xs font-medium text-danger hover:underline">
                <Trash className="h-3 w-3" /> Delete
              </button>
              {!addr.isDefault && (
                <>
                  <span className="text-border">·</span>
                  <button className="font-body text-xs font-medium text-fg hover:underline">Set as Default</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AddPaymentDialog({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (upiId: string) => void }) {
  const [upiId, setUpiId] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!/^[\w.\-]+@[\w.\-]+$/.test(upiId.trim())) {
      setError('Enter a valid UPI ID, e.g. name@bank')
      return
    }
    onAdd(upiId.trim())
    setUpiId('')
    setError(null)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-body text-base font-bold text-fg">Add Payment Method</h3>
          <button type="button" onClick={onClose} className="text-muted-warm hover:text-fg"><X className="h-5 w-5" /></button>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="font-body text-sm font-semibold text-fg">UPI ID</span>
          <input
            autoFocus
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            placeholder="yourname@bank"
            className="rounded-lg border border-border bg-bg px-3 py-[11px] font-body text-md text-fg outline-none focus:border-store-primary"
          />
          {error && <span className="font-body text-xs text-danger">{error}</span>}
        </label>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="grow rounded-lg border border-border py-2.5 font-body text-sm font-semibold text-fg">Cancel</button>
          <button type="submit" className="grow rounded-lg bg-store-primary py-2.5 font-body text-sm font-semibold text-surface">Save</button>
        </div>
      </form>
    </Dialog>
  )
}

export function PaymentsContent() {
  const [payments, setPayments] = useState<PaymentMethod[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)

  function addPayment(upiId: string) {
    setPayments((prev) => [...prev, { id: crypto.randomUUID(), upiId, isDefault: prev.length === 0 }])
  }

  function removePayment(id: string) {
    setPayments((prev) => prev.filter((p) => p.id !== id))
  }

  function setDefault(id: string) {
    setPayments((prev) => prev.map((p) => ({ ...p, isDefault: p.id === id })))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-body text-sm font-bold text-fg">Saved Payment Methods</h3>
        <button onClick={() => setDialogOpen(true)} className="flex items-center gap-1.5 rounded-lg border border-store-primary px-3 py-1.5 font-body text-xs font-semibold text-store-primary hover:bg-store-primary/5">
          <Plus className="h-3.5 w-3.5" /> Add Payment Method
        </button>
      </div>

      {payments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="font-body text-sm font-semibold text-fg">No payment methods saved yet</p>
          <p className="font-body text-xs text-muted-warm mt-1">Add a UPI ID to check out faster next time.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {payments.map(pm => (
            <div key={pm.id} className="rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-body text-xs font-bold text-green-600">UPI</span>
                <span className="font-body text-sm font-bold text-fg">{pm.upiId}</span>
                {pm.isDefault && (
                  <span className="rounded-full bg-success/10 px-2 py-0.5 font-body text-[10px] font-bold text-success uppercase tracking-wide">Default</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                {!pm.isDefault && (
                  <>
                    <button onClick={() => setDefault(pm.id)} className="font-body text-xs font-medium text-fg hover:underline">Set as Default</button>
                    <span className="text-border">·</span>
                  </>
                )}
                <button onClick={() => removePayment(pm.id)} className="flex items-center gap-1 font-body text-xs font-medium text-danger hover:underline">
                  <Trash className="h-3 w-3" /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddPaymentDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onAdd={addPayment} />
    </div>
  )
}

export function NotificationsContent() {
  const [deals, setDeals] = useState(true)
  const [orderUpdates, setOrderUpdates] = useState(true)
  const [promos, setPromos] = useState(false)

  return (
    <div className="divide-y divide-border">
      <div className="flex items-center justify-between py-3 first:pt-0">
        <div>
          <div className="font-body text-sm font-semibold text-fg">Deals</div>
          <div className="font-body text-xs text-muted-warm">Offers, discounts, and new drops</div>
        </div>
        <Toggle checked={deals} onChange={setDeals} />
      </div>
      <div className="flex items-center justify-between py-3">
        <div>
          <div className="font-body text-sm font-semibold text-fg">Order Updates</div>
          <div className="font-body text-xs text-muted-warm">Shipping and delivery updates</div>
        </div>
        <Toggle checked={orderUpdates} onChange={setOrderUpdates} />
      </div>
      <div className="flex items-center justify-between py-3 last:pb-0">
        <div>
          <div className="font-body text-sm font-semibold text-fg">Promotions</div>
          <div className="font-body text-xs text-muted-warm">Flash sales and limited-time deals</div>
        </div>
        <Toggle checked={promos} onChange={setPromos} />
      </div>
    </div>
  )
}
