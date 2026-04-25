"use client"

import { useState, useEffect, useCallback } from 'react'
import { Star, ChevronLeft, ChevronRight } from 'lucide-react'
import { DEFAULT_REVIEWS, type CustomerReview } from '@/lib/reviews-data'
import { setStorageWithSync } from '@/lib/storage-sync'

const REVIEWS_STORAGE_KEY = 'customerReviews'

export function Reviews() {
  const [reviews, setReviews] = useState<CustomerReview[]>(DEFAULT_REVIEWS)
  const [current, setCurrent] = useState(0)
  const itemsPerView = 3

  const visibleReviews = reviews.filter((review) => review.isVisible)

  useEffect(() => {
    const stored = localStorage.getItem(REVIEWS_STORAGE_KEY)
    if (!stored) {
      setStorageWithSync(REVIEWS_STORAGE_KEY, JSON.stringify(DEFAULT_REVIEWS))
      setReviews(DEFAULT_REVIEWS)
      return
    }

    try {
      const parsed = JSON.parse(stored) as CustomerReview[]
      setReviews(parsed)
    } catch {
      setReviews(DEFAULT_REVIEWS)
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key !== REVIEWS_STORAGE_KEY) {
        return
      }

      try {
        const value = localStorage.getItem(REVIEWS_STORAGE_KEY)
        if (!value) {
          return
        }
        const parsed = JSON.parse(value) as CustomerReview[]
        setReviews(parsed)
      } catch {
        // Keep current view if parsing fails
      }
    }

    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % Math.max(visibleReviews.length, 1))
  }, [visibleReviews.length])

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + Math.max(visibleReviews.length, 1)) % Math.max(visibleReviews.length, 1))
  }, [visibleReviews.length])

  useEffect(() => {
    if (visibleReviews.length <= 1) {
      return
    }
    const timer = setInterval(next, 5000)
    return () => clearInterval(timer)
  }, [next, visibleReviews.length])

  useEffect(() => {
    if (current >= visibleReviews.length) {
      setCurrent(0)
    }
  }, [current, visibleReviews.length])

  const getVisibleReviews = () => {
    if (visibleReviews.length === 0) {
      return []
    }

    const visible = []
    const viewCount = Math.min(itemsPerView, visibleReviews.length)
    for (let i = 0; i < viewCount; i++) {
      visible.push(visibleReviews[(current + i) % visibleReviews.length])
    }
    return visible
  }

  return (
    <section id="reviews" className="bg-gradient-to-b from-muted/10 via-background to-background py-20 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        <div className="mb-16 text-center fade-in-up">
          <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-[#C1121F] animate-pulse">
             ⭐ Customer Love
          </span>
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4">
            What Our Customers Say
          </h2>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">Loved by thousands across Karachi</p>
        </div>

        <div className="relative">
          {visibleReviews.length === 0 ? (
            <div className="rounded-3xl border border-border/60 bg-card p-8 text-center text-muted-foreground">
              No approved reviews yet. Be the first to submit one.
            </div>
          ) : (
          <div className="grid gap-8 md:grid-cols-3">
            {getVisibleReviews().map((review, index) => (
              <div
                key={`${review.name}-${index}`}
                className="relative rounded-3xl border border-border/60 bg-gradient-to-br from-card/70 to-card/40 p-8 shadow-lg transition-all duration-500 hover:shadow-2xl hover:-translate-y-3 hover:border-[#C1121F]/50 fade-in-up group backdrop-blur-sm"
                style={{
                  animation: `fadeInUp 0.6s ease-out forwards`,
                  animationDelay: `${index * 0.1}s`
                }}
              >
                {/* Header with Avatar */}
                <div className="mb-6 flex items-center gap-4">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#C1121F] to-[#A00D1B] text-sm font-bold text-white shadow-lg group-hover:scale-110 transition-transform">
                    {review.initial}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground group-hover:text-[#C1121F] transition-colors">{review.name}</p>
                    <div className="flex items-center gap-0.5 mt-1.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 transition-transform group-hover:scale-110 ${
                            i < review.rating
                              ? 'fill-[#F4A261] text-[#F4A261]'
                              : 'text-muted-foreground/30'
                          }`}
                          style={{
                            transitionDelay: `${i * 50}ms`
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Review Text */}
                <p className="text-sm leading-relaxed text-muted-foreground group-hover:text-foreground/80 transition-colors line-clamp-4 relative">
                  <span className="text-3xl text-[#C1121F]/15 absolute -top-3 -left-1">"</span>
                  {review.review}
                  <span className="text-3xl text-[#C1121F]/15 absolute -bottom-5 right-0">"</span>
                </p>

                {/* Shine effect */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 -skew-x-12"></div>
              </div>
            ))}
          </div>
          )}

          {/* Navigation Controls */}
          {visibleReviews.length > 1 && (
          <div className="mt-12 flex items-center justify-center gap-4">
            <button
              onClick={prev}
              className="p-3 rounded-full bg-muted hover:bg-gradient-to-r hover:from-[#C1121F]/20 hover:to-[#C1121F]/10 text-foreground hover:text-[#C1121F] transition-all duration-300 hover:scale-110 active:scale-95 border border-border/60 hover:border-[#C1121F]/40"
              aria-label="Previous reviews"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            
            <div className="flex gap-2.5">
              {Array.from({ length: visibleReviews.length }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`rounded-full transition-all duration-300 ${
                    i >= current && i < current + itemsPerView
                      ? 'bg-gradient-to-r from-[#C1121F] to-[#A00D1B] w-10'
                      : 'bg-muted-foreground/30 w-3 hover:bg-muted-foreground/50'
                  }`}
                  aria-label={`Go to review ${i + 1}`}
                />
              ))}
            </div>
            
            <button
              onClick={next}
              className="p-3 rounded-full bg-muted hover:bg-gradient-to-r hover:from-[#C1121F]/20 hover:to-[#C1121F]/10 text-foreground hover:text-[#C1121F] transition-all duration-300 hover:scale-110 active:scale-95 border border-border/60 hover:border-[#C1121F]/40"
              aria-label="Next reviews"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          )}
        </div>

      </div>
    </section>
  )
}
