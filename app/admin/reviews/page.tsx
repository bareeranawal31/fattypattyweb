"use client"

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Eye, EyeOff, Loader2, RefreshCw, Search, Star } from 'lucide-react'
import { toast } from '@/lib/notify'
import { DEFAULT_REVIEWS, type CustomerReview } from '@/lib/reviews-data'
import { setStorageWithSync } from '@/lib/storage-sync'

const REVIEWS_STORAGE_KEY = 'customerReviews'

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<CustomerReview[]>([])
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const loadReviews = () => {
    setIsLoading(true)
    try {
      const stored = localStorage.getItem(REVIEWS_STORAGE_KEY)
      if (!stored) {
        setStorageWithSync(REVIEWS_STORAGE_KEY, JSON.stringify(DEFAULT_REVIEWS))
        setReviews(DEFAULT_REVIEWS)
      } else {
        const parsed = JSON.parse(stored) as CustomerReview[]
        setReviews(parsed)
      }
    } catch {
      setReviews(DEFAULT_REVIEWS)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadReviews()
    const onStorage = (e: StorageEvent) => {
      if (e.key !== REVIEWS_STORAGE_KEY) return
      const stored = localStorage.getItem(REVIEWS_STORAGE_KEY)
      if (!stored) return
      try {
        setReviews(JSON.parse(stored) as CustomerReview[])
      } catch {}
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) {
      return reviews
    }

    const q = query.toLowerCase()
    return reviews.filter((review) => {
      return review.name.toLowerCase().includes(q) || review.review.toLowerCase().includes(q)
    })
  }, [reviews, query])

  const updateReviews = (nextReviews: CustomerReview[]) => {
    setReviews(nextReviews)
    setStorageWithSync(REVIEWS_STORAGE_KEY, JSON.stringify(nextReviews))
  }

  const toggleVisibility = (reviewId: string) => {
    const nextReviews = reviews.map((review) => {
      if (review.id !== reviewId) {
        return review
      }
      return { ...review, isVisible: !review.isVisible }
    })

    updateReviews(nextReviews)
    toast.success('Review visibility updated')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reviews Moderation</h1>
          <p className="text-sm text-muted-foreground">Choose which customer reviews appear on the website</p>
        </div>
        <button
          onClick={loadReviews}
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search reviews by name or text"
          className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
        />
      </div>

      <div className="rounded-xl border border-border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-brand-red" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No reviews found</div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((review) => (
              <div key={review.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-start md:justify-between">
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-3">
                    <p className="font-semibold text-foreground">{review.name}</p>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star
                          key={`${review.id}-star-${index}`}
                          className={`h-3.5 w-3.5 ${index < review.rating ? 'fill-brand-gold text-brand-gold' : 'text-muted-foreground/40'}`}
                        />
                      ))}
                    </div>
                    {review.isVisible ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Visible</span>
                    ) : (
                      <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">Hidden</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{review.review}</p>
                </div>

                <button
                  onClick={() => toggleVisibility(review.id)}
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
                >
                  {review.isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {review.isVisible ? 'Hide' : 'Show'}
                  <CheckCircle2 className="h-4 w-4 text-brand-red" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
