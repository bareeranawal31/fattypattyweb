"use client"

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Navbar } from '@/components/navbar'
import { MenuSection } from '@/components/menu-section'
import { Footer } from '@/components/footer'
import { CartDrawer } from '@/components/cart-drawer'
import { ProductModal } from '@/components/product-modal'
import { WelcomeScreen } from '@/components/welcome-screen'
import { useOrder } from '@/lib/order-context'
import type { MenuItem } from '@/lib/menu-data'

const RECENTLY_VIEWED_KEY = 'recently-viewed-items'
const MAX_RECENTLY_VIEWED = 6

export default function MenuPage() {
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [recentlyViewed, setRecentlyViewed] = useState<MenuItem[]>([])
  const { hasCompletedSetup, isHydrated } = useOrder()

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]') as MenuItem[]
      setRecentlyViewed(Array.isArray(saved) ? saved.slice(0, MAX_RECENTLY_VIEWED) : [])
    } catch {
      setRecentlyViewed([])
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== RECENTLY_VIEWED_KEY) return
      try {
        const saved = JSON.parse(event.newValue || '[]') as MenuItem[]
        setRecentlyViewed(Array.isArray(saved) ? saved.slice(0, MAX_RECENTLY_VIEWED) : [])
      } catch {
        setRecentlyViewed([])
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const handleItemClick = (item: MenuItem) => {
    setSelectedItem(item)

    try {
      const existing = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]') as MenuItem[]
      const next = [item, ...existing.filter((existingItem) => existingItem.id !== item.id)]
        .slice(0, MAX_RECENTLY_VIEWED)
      localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(next))
      setRecentlyViewed(next)
    } catch {
      setRecentlyViewed((current) => [item, ...current.filter((existingItem) => existingItem.id !== item.id)].slice(0, MAX_RECENTLY_VIEWED))
    }
  }

  // Show nothing until hydrated to prevent welcome screen flash
  if (!isHydrated) {
    return null
  }

  if (!hasCompletedSetup) {
    return <WelcomeScreen />
  }

  return (
    <>
      <Navbar onItemClick={handleItemClick} />
      <main className="pt-14">
        <MenuSection onItemClick={handleItemClick} />

        {recentlyViewed.length > 0 && (
          <section className="site-section border-t border-border bg-background/95 py-10 lg:py-14">
            <div className="site-container px-4 lg:px-8">
              <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <span className="section-kicker">Recent Picks</span>
                  <h2 className="section-title text-2xl sm:text-3xl">Recently Viewed</h2>
                </div>
                <p className="max-w-xl text-sm text-muted-foreground md:text-right">
                  Jump back to items you opened recently.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {recentlyViewed.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleItemClick(item)}
                    className="group overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
                  >
                    <div className="relative aspect-[16/10] w-full overflow-hidden">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                    </div>
                    <div className="flex flex-col gap-3 p-4">
                      <div>
                        <p className="truncate text-sm font-semibold text-foreground">{item.name}</p>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-bold text-brand-red">
                          Rs. {item.price.toLocaleString()}
                        </span>
                        <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground transition-colors group-hover:bg-brand-red group-hover:text-white">
                          View again
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
      <CartDrawer onItemClick={setSelectedItem} />
      {selectedItem && (
        <ProductModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </>
  )
}
