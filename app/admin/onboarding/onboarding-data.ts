export const STEPS = [
  { mobile: 'Store', title: 'Store & website', description: 'Name, category, and URL' },
  { mobile: 'Brand', title: 'Brand your store', description: 'Logo, colors, and look' },
  { mobile: 'Contact', title: 'Contact & address', description: 'Phone, email, and location' },
  { mobile: 'Story', title: 'Your story', description: 'Tagline and about your store' },
  { mobile: 'Plan', title: 'Choose your plan', description: 'Pick the subscription that fits your store' },
  { mobile: 'Pay', title: 'Connect payments', description: 'UPI, Razorpay, or Instamojo' },
] as const

export const STEP_ACCENTS = [
  { wash: '#c1502e', solid: 'bg-brand-primary', text: 'text-brand-primary' },
  { wash: '#e8577e', solid: 'bg-store-primary', text: 'text-store-primary' },
  { wash: '#f59e0b', solid: 'bg-amber', text: 'text-amber' },
  { wash: '#8b5cf6', solid: 'bg-violet-500', text: 'text-violet-500' },
  { wash: '#0ea5e9', solid: 'bg-sky-500', text: 'text-sky-500' },
  { wash: '#14b8a6', solid: 'bg-teal-500', text: 'text-teal-500' },
] as const

// Two plans only, matching the marketing page. Growth/₹0-Starter are retired — the `growth`
// Tier enum value stays in the DB for existing tenants, it's just no longer offered here.
export const SUBSCRIPTION_PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '₹499',
    period: '/mo',
    description: '14-day free trial, then ₹499/mo',
    features: ['Up to 100 products', '500 OTP logins/mo', 'WhatsApp button', 'Discount codes', 'Wishlist'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '₹1,499',
    period: '/mo',
    description: '14-day free trial, then ₹1,499/mo',
    features: ['Unlimited products', '2,000 OTP logins/mo', 'Advanced analytics', 'Priority support'],
  },
] as const

export type SubscriptionTier = (typeof SUBSCRIPTION_PLANS)[number]['id']

// ponytail: textile-only for v1 per product decision — no bakery/salon/handicraft verticals yet.
export const STORE_TYPES = [
  'Sarees',
  'Salwar & Kurtis',
  'Lehengas',
  'Menswear',
  'Kids wear',
  'Unstitched fabric',
  'Blouses',
  'Dupattas & stoles',
  'Home textiles',
  'Other',
] as const

export { STORE_THEMES } from '@/lib/store-themes'

export const PAYMENTS = [
  {
    id: 'upi',
    name: 'UPI',
    description: 'Google Pay, PhonePe, BHIM, Paytm',
    commission: '0% fee · No KYC required',
    markClassName: 'bg-bg-dark text-amber',
    mark: 'UPI',
  },
  {
    id: 'razorpay',
    name: 'Razorpay',
    description: 'Credit/Debit Card, UPI, Wallets',
    commission: '2% per transaction · KYC via Razorpay',
    markClassName: 'bg-[#072654] text-surface',
    mark: 'RZP',
  },
  {
    id: 'instamojo',
    name: 'Instamojo',
    description: 'Credit/Debit Card, UPI, EMI',
    commission: '2% + ₹3 per transaction · PAN + savings account',
    markClassName: 'bg-[#004282] text-surface',
    mark: 'IM',
  },
] as const

// Common PSP handles shown as autocomplete chips once the merchant types "@" in the UPI field.
export const UPI_HANDLES = ['@okhdfcbank', '@ybl', '@oksbi', '@paytm', '@okaxis', '@upi'] as const

export type { StoreThemeColor as BrandColor } from '@/lib/store-themes'
export type PaymentId = (typeof PAYMENTS)[number]['id']
