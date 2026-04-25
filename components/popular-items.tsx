"use client"

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Star, Zap } from 'lucide-react'
import { popularItems } from '@/lib/menu-data'
import type { MenuItem } from '@/lib/menu-data'
import { useCustomerAuth } from '@/lib/customer-auth-context'
import { SignInBenefitsPrompt } from '@/components/signin-benefits-prompt'

interface PopularItemsProps {
  onItemClick: (item: MenuItem) => void
}

export function PopularItems({ onItemClick }: PopularItemsProps) {
  const router = useRouter()
  const { user, loading: authLoading } = useCustomerAuth()
  const [productRatings, setProductRatings] = useState<Record<string, number>>({})
  const [pendingQuickAddItem, setPendingQuickAddItem] = useState<MenuItem | null>(null)

  useEffect(() => {
    const loadRatings = () => {
      try {
        const saved = JSON.parse(localStorage.getItem('productRatings') || '{}') as
          Record<string, { average: number; count: number }>
        const mapped: Record<string, number> = {}
        for (const [id, data] of Object.entries(saved)) {
          mapped[id] = data.average
        }
        setProductRatings(mapped)
      } catch {}
    }
    loadRatings()
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'productRatings') loadRatings()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const handleQuickAdd = (e: React.MouseEvent, item: MenuItem) => {
    e.stopPropagation()
    if (authLoading || user) {
      onItemClick(item)
      return
    }

    setPendingQuickAddItem(item)
  }

  const handleCardClick = (item: MenuItem) => {
    if (authLoading || user) {
      onItemClick(item)
      return
    }

    setPendingQuickAddItem(item)
  }

  return (
    <>
      <SignInBenefitsPrompt
        open={Boolean(pendingQuickAddItem) && !authLoading}
        onClose={() => setPendingQuickAddItem(null)}
        onSignIn={() => {
          setPendingQuickAddItem(null)
          router.push(`/auth/customer?returnTo=${encodeURIComponent('/')}`)
        }}
        onContinueGuest={() => {
          if (pendingQuickAddItem) {
            onItemClick(pendingQuickAddItem)
          }
          setPendingQuickAddItem(null)
        }}
      />
      <section className="bg-gradient-to-b from-background via-muted/20 to-background py-20 lg:py-32">
        <div className="site-container">
        <div className="section-head fade-in-up">
          <span className="section-kicker justify-center">
            <Zap className="h-4 w-4" /> Most Popular
          </span>
          <h2 className="section-title">
            Fan Favorites
          </h2>
          <p className="section-description">Loved by thousands of customers across Karachi</p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {popularItems.map((item, idx) => (
            <div
              key={item.id}
              onClick={() => handleCardClick(item)}
              className="ui-card group relative cursor-pointer overflow-hidden fade-in-up hover:border-brand-red/35"
              style={{
                animation: `fadeInUp 0.6s ease-out forwards`,
                animationDelay: `${idx * 0.1}s`
              }}
            >
              {/* Image Container */}
              <div className="relative h-60 w-full overflow-hidden bg-gradient-to-br from-muted/60 to-muted/20">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a]/90 via-[#1a1a1a]/40 to-transparent transition-all duration-300 group-hover:from-[#1a1a1a]/85 group-hover:via-[#1a1a1a]/25" />
                
                {/* Popular Badge */}
                <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-brand-gold px-3 py-1.5 text-xs font-semibold text-[#1a1a1a] shadow-sm transition-all">
                  <Zap className="h-4 w-4" />
                  Popular
                </div>
                
                {/* Rating Badge */}
                <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full border border-white/20 bg-[#1a1a1a]/85 px-3 py-1.5 shadow-sm backdrop-blur-md transition-all">
                  <Star className="h-4 w-4 fill-[#F4A261] text-[#F4A261]" />
                  <span className="text-xs font-bold text-white">{(productRatings[item.id] ?? item.rating).toFixed(1)}</span>
                </div>
              </div>

              {/* Content Container */}
              <div className="flex h-52 flex-col justify-between p-6">
                <div>
                  <h3 className="mb-2 text-xl font-bold text-foreground transition-colors group-hover:text-brand-red line-clamp-2">
                    {item.name}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2 transition-colors group-hover:text-foreground/80">
                    {item.description}
                  </p>
                </div>
                
                {/* Footer */}
                <div className="flex items-center justify-between border-t border-border/60 pt-5 transition-colors">
                  <div>
                    <span className="text-2xl font-bold text-brand-red">
                      Rs. {item.price.toLocaleString()}
                    </span>
                  </div>
                  <button
                    onClick={(e) => handleQuickAdd(e, item)}
                    className="ui-btn-primary flex items-center gap-1.5 rounded-full px-4 py-2 text-xs text-white"
                    aria-label={`Add ${item.name} to cart`}
                  >
                    <span aria-hidden="true" className="text-base leading-none font-bold">+</span>
                    Add
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        </div>
      </section>
    </>
  )
}
