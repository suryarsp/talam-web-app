/**
 * UPI intent URLs — the "any payment setup" path.
 *
 * A `upi://pay?…` deep link encoded as a QR is scannable by every UPI app (GPay,
 * PhonePe, Paytm, bank apps), so a store owner needs nothing but their own VPA —
 * no gateway account, no onboarding, no API keys. The VPA comes from the admin
 * Payments tab (`tenant.paymentConfig.upi.upiId`).
 */

export type UpiIntentParams = {
  vpa: string
  storeName: string
  /** Rupees, not paise — UPI's `am` parameter is a decimal amount. */
  amount: number
  note: string
}

/** NPCI spec allows two decimal places on `am`; anything else is rejected by some apps. */
export function buildUpiIntent({ vpa, storeName, amount, note }: UpiIntentParams): string {
  const params = new URLSearchParams({
    pa: vpa,
    pn: storeName,
    am: amount.toFixed(2),
    tn: note,
    cu: 'INR',
  })
  return `upi://pay?${params.toString()}`
}

export function isValidVpa(vpa: string): boolean {
  // Mirrors the validation already enforced in updatePaymentsSettingsAction.
  return /^[\w.-]+@[\w.-]+$/.test(vpa.trim())
}
