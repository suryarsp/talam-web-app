'use client'

import { useState } from 'react'

type Review = {
  id: string
  rating: number
  comment: string | null
  isVerifiedPurchase: boolean
  createdAt: Date
  customer: { name: string | null }
}

function relativeTime(date: Date): string {
  const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (days < 1) return 'Today'
  if (days === 1) return '1 day ago'
  if (days < 7) return `${days} days ago`
  const weeks = Math.floor(days / 7)
  return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`
}

type Props = {
  reviews: Review[]
  averageRating: number | null
  count: number
  onSubmitReview: (rating: number, comment: string) => Promise<void>
}

export function ReviewsSection({ reviews, averageRating, count, onSubmitReview }: Props) {
  const [draftRating, setDraftRating] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (draftRating === 0) return
    setSubmitting(true)
    await onSubmitReview(draftRating, comment)
    setSubmitting(false)
    setShowForm(false)
    setComment('')
    setDraftRating(0)
  }

  return (
    <div className="mt-8 space-y-8 border-t border-border pt-8">
      <div className="space-y-3">
        <h2 className="font-heading text-xl font-bold text-fg">Share Your Experience</h2>
        <p className="font-body text-sm text-muted-warm">
          Rate this product and help other customers make informed decisions
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                aria-label={`Rate ${star} stars`}
                onClick={() => {
                  setDraftRating(star)
                  setShowForm(true)
                }}
                className={`text-2xl ${star <= draftRating ? 'text-amber' : 'text-border'}`}
              >
                ★
              </button>
            ))}
          </div>
          {!showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="rounded-lg border border-store-primary px-4 py-2 font-body text-sm font-semibold text-store-primary"
            >
              Write a Review
            </button>
          )}
        </div>
        {showForm && (
          <div className="space-y-3">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us about your experience with this product…"
              className="w-full rounded-lg border border-border p-3 font-body text-sm text-fg"
              rows={3}
            />
            <button
              type="button"
              disabled={submitting || draftRating === 0}
              onClick={handleSubmit}
              className="rounded-lg bg-store-primary px-5 py-2.5 font-body text-sm font-semibold text-surface disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Submit Review'}
            </button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-xl font-bold text-fg">Customer Reviews</h2>
          {count > 0 && (
            <p className="font-body text-sm text-muted-warm">
              {averageRating?.toFixed(1)}★ · {count} verified reviews
            </p>
          )}
        </div>

        {reviews.length === 0 ? (
          <p className="font-body text-sm text-muted-warm">No reviews yet. Be the first to share your experience.</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="rounded-lg border border-border p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-body text-sm font-bold text-fg">{review.customer.name ?? 'Anonymous'}</p>
                    <p className="font-body text-xs text-muted-warm">{relativeTime(review.createdAt)}</p>
                  </div>
                  <p className="font-body text-sm text-success">{'★'.repeat(review.rating)}</p>
                </div>
                {review.isVerifiedPurchase && (
                  <span className="mt-2 inline-block rounded-full bg-success-bg px-2.5 py-1 font-body text-xs text-success">
                    ✓ Verified Purchase
                  </span>
                )}
                {review.comment && (
                  <p className="mt-2 font-body text-sm leading-relaxed text-fg">{review.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
