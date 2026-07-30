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

// ponytail: placeholder pricing/features — swap for real plan copy once pricing is finalized.
export const SUBSCRIPTION_PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '₹0',
    period: '/mo',
    description: 'Everything you need to launch',
    features: ['Up to 25 products', 'Basic storefront themes', 'Email support'],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: '₹999',
    period: '/mo',
    description: 'For stores ready to scale',
    features: ['Up to 250 products', 'Custom domain', 'Priority support', 'Advanced analytics'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '₹2,499',
    period: '/mo',
    description: 'Full power for high-growth brands',
    features: ['Unlimited products', 'Custom domain', 'Dedicated support', 'Advanced analytics', 'API access'],
  },
] as const

export type SubscriptionTier = (typeof SUBSCRIPTION_PLANS)[number]['id']

export const STORE_TYPES = ['Ethnic wear', 'Bakery', 'Handicrafts', 'Salon', 'Other'] as const

export const BRAND_COLORS = ['#4F3FF0', '#EC4899', '#06B6D4', '#8B5CF6'] as const

export const PAYMENTS = [
  {
    id: 'upi',
    name: 'UPI',
    description: 'Google Pay, PhonePe, BHIM, Paytm',
    markClassName: 'bg-bg-dark text-amber',
    mark: 'UPI',
  },
  {
    id: 'razorpay',
    name: 'Razorpay',
    description: 'Credit/Debit Card, UPI, Wallets',
    markClassName: 'bg-[#072654] text-surface',
    mark: 'RZP',
  },
  {
    id: 'instamojo',
    name: 'Instamojo',
    description: 'Credit/Debit Card, UPI, EMI',
    markClassName: 'bg-[#004282] text-surface',
    mark: 'IM',
  },
] as const

export type BrandColor = (typeof BRAND_COLORS)[number]
export type PaymentId = (typeof PAYMENTS)[number]['id']
