import 'dotenv/config'
import { createQrCode } from '../lib/razorpay'

// ponytail: one-off manual verification script, not wired into any app flow —
// proves TALAM_RAZORPAY_KEY_ID/SECRET work against the live API before the
// Route onboarding pieces (Tasks 3-6) are built on top of them.
async function main() {
  const qr = await createQrCode({ amountPaise: 100, description: 'Talam Razorpay credential check' })
  console.log('QR code created:', qr.id)
  console.log('Status:', qr.status)
  console.log('Scan this image to pay ₹1 and confirm the credentials work end-to-end:')
  console.log(qr.image_url)
}

main().catch((error) => {
  console.error('QR generation failed:', error)
  process.exit(1)
})
