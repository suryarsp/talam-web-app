/**
 * How a courier's ETA in *days* becomes the date a shopper actually reads.
 *
 * Kept apart from getDeliveryEstimate so the checkout summary, the product page widget, the
 * order confirmation page and the confirmation email all render the same wording from the
 * same arithmetic — a shopper who sees "Fri, 4 Sept" at checkout must see it again in the mail.
 */
export function formatDeliveryDate(placedAt: Date, etaDays: number): string {
  return new Date(placedAt.getTime() + etaDays * 86400_000).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}
