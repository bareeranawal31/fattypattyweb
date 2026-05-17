"use client"

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Flame, Check } from 'lucide-react'
import type { Deal } from '@/lib/menu-data'

interface PromotionsProps {
  onDealClick: (deal: Deal) => void
}

export function Promotions({ onDealClick }: PromotionsProps) {
  const [deals, setDeals] = useState<Deal[]>([])

  // Load deals from API only to keep customer view in sync with admin changes.
  useEffect(() => {
    const loadDeals = async () => {
      try {
        const response = await fetch('/api/menu', { cache: 'no-store' })
        const responseText = await response.text()
        if (!response.ok) {
          throw new Error(`Failed to fetch deals from API: ${response.status}`)
        }
        let data: any
        try {
          data = JSON.parse(responseText)
        } catch (error) {
          throw new Error('Invalid JSON response from /api/menu')
        }

        if (data.data?.deals && data.data.deals.length > 0) {
          // Convert API deals to Deal format
          const convertedDeals: Deal[] = data.data.deals
            .filter((d: Record<string, unknown>) => d.is_active !== false)
            .map((d: Record<string, unknown>) => ({
              id: d.id as string,
              name: (d.name as string) || '',
              title: (d.title as string) || (d.description as string) || (d.name as string),
              image: (d.image as string) || (d.image_url as string) || '/images/deals.jpg',
              price: (d.price as number) || (d.fixed_price as number) || 0,
              items: (d.items as string[]) || [],
            }))
          if (convertedDeals.length > 0) {
            setDeals(convertedDeals)
            return
          }
        }
      } catch (error) {
        console.error('[v0] Error fetching deals from API:', error)
      }

      setDeals([])
    }
    
    loadDeals()
    
    // Set up interval to refresh from API every 30 seconds
    const interval = setInterval(loadDeals, 30000)
    
    return () => clearInterval(interval)
  }, [])

  return (
    <section id="deals" className="site-section bg-gradient-to-b from-background via-background to-muted/20">
      <div className="site-container">
        <div className="section-head fade-in-up">
          <span className="section-kicker justify-center">
            <Flame className="h-4 w-4" /> Limited Time
          </span>
          <h2 className="section-title">
            Deals You Cannot Miss
          </h2>
          <p className="section-description">Incredible offers on your favorites - available for a limited time only</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {deals.map((deal, idx) => (
            <button
              key={deal.id}
              onClick={() => onDealClick(deal)}
              className="ui-card group relative overflow-hidden text-left fade-in-up hover:border-brand-red/35"
              style={{
                animation: `fadeInUp 0.6s ease-out forwards`,
                animationDelay: `${idx * 0.1}s`
              }}
            >
              {/* Image Container */}
              <div className="relative h-56 w-full overflow-hidden bg-gradient-to-br from-muted/60 to-muted/20">
                <Image
                  src={deal.image}
                  alt={deal.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a]/95 via-[#1a1a1a]/50 to-transparent group-hover:from-[#1a1a1a]/90 group-hover:via-[#1a1a1a]/40 transition-all duration-300" />
                
                {/* Hot Deal Badge */}
                <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-brand-gold px-3 py-1.5 shadow-sm">
                  <Flame className="h-4 w-4 text-[#1a1a1a]" />
                  <span className="text-xs font-semibold text-[#1a1a1a]">{deal.name}</span>
                </div>
                
                {/* Deal Title */}
                <div className="absolute bottom-6 left-6 right-6">
                  <h3 className="text-2xl lg:text-3xl font-bold text-white leading-tight line-clamp-2 group-hover:text-[#F4A261] transition-colors">
                    {deal.title}
                  </h3>
                </div>
              </div>

              {/* Content */}
              <div className="flex h-48 flex-col justify-between p-6">
                <ul className="space-y-3 mb-4">
                  {deal.items.slice(0, 2).map((item, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-sm text-muted-foreground group-hover:text-foreground/80 transition-colors">
                      <Check className="h-5 w-5 flex-shrink-0 text-[#C1121F] font-bold" />
                      <span className="line-clamp-1 font-medium">{item}</span>
                    </li>
                  ))}
                  {deal.items.length > 2 && (
                    <li className="text-xs text-muted-foreground/80 font-semibold italic">
                      + {deal.items.length - 2} more items
                    </li>
                  )}
                </ul>
                
                {/* Footer */}
                <div className="flex items-center justify-between pt-6 border-t border-border/50 group-hover:border-border transition-colors">
                  <div>
                    <span className="text-2xl font-bold text-brand-red">
                      Rs. {deal.price.toLocaleString()}
                    </span>
                  </div>
                  <div className="ui-btn-primary rounded-full px-5 py-2 text-xs">
                    View Deal
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
