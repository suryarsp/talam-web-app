'use client'

import { useState } from 'react'
import { Plus, CreditCard, Pencil, Trash, Info } from 'lucide-react'

const mockAddresses = [
  { id: '1', label: 'Home', name: 'Priya Rajan', line1: '42, Bharathi Nagar, 2nd Cross Street', line2: 'Madurai, Tamil Nadu 625001', phone: '+91 98765 43210', isDefault: true },
  { id: '2', label: 'Office', name: 'Priya Rajan', line1: '3rd Floor, Tech Park, Anna Salai', line2: 'Chennai, Tamil Nadu 600002', phone: '+91 98765 43210', isDefault: false },
]

const mockPayments = [
  { id: '1', type: 'card' as const, brand: 'HDFC Visa', last4: '4821', expiry: '08/28', isDefault: true },
  { id: '2', type: 'upi' as const, upiId: 'priya@okicici', isDefault: false },
]

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

export function PaymentsContent() {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-body text-sm font-bold text-fg">Saved Payment Methods</h3>
        <button className="flex items-center gap-1.5 rounded-lg border border-store-primary px-3 py-1.5 font-body text-xs font-semibold text-store-primary hover:bg-store-primary/5">
          <Plus className="h-3.5 w-3.5" /> Add Payment Method
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {mockPayments.map(pm => (
          <div key={pm.id} className="rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              {pm.type === 'card' ? (
                <CreditCard className="h-4 w-4 text-muted-warm" />
              ) : (
                <span className="font-body text-xs font-bold text-green-600">UPI</span>
              )}
              <span className="font-body text-sm font-bold text-fg">
                {pm.type === 'card' ? `${pm.brand} •••• ${pm.last4}` : pm.upiId}
              </span>
              {pm.isDefault && (
                <span className="rounded-full bg-success/10 px-2 py-0.5 font-body text-[10px] font-bold text-success uppercase tracking-wide">Default</span>
              )}
            </div>
            {pm.type === 'card' && pm.expiry && (
              <p className="font-body text-xs text-muted-warm">Expires {pm.expiry}</p>
            )}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
              {!pm.isDefault && (
                <>
                  <button className="font-body text-xs font-medium text-fg hover:underline">Set as Default</button>
                  <span className="text-border">·</span>
                </>
              )}
              <button className="flex items-center gap-1 font-body text-xs font-medium text-danger hover:underline">
                <Trash className="h-3 w-3" /> Remove
              </button>
            </div>
          </div>
        ))}
      </div>
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
