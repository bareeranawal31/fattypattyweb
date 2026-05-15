"use client"

import { Suspense, useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { Hero } from '@/components/hero'
import { MealSuggester } from '@/components/meal-suggester'
import { Categories } from '@/components/categories'
import { PopularItems } from '@/components/popular-items'
import { Promotions } from '@/components/promotions'
import { Reviews } from '@/components/reviews'
import { Contact } from '@/components/contact'
import { Footer } from '@/components/footer'
import { CartDrawer } from '@/components/cart-drawer'
import { ProductModal } from '@/components/product-modal'
import { DealModal } from '@/components/deal-modal'
import { WelcomeScreen } from '@/components/welcome-screen'
import { useOrder } from '@/lib/order-context'
import type { MenuItem, Deal } from '@/lib/menu-data'

function HomePageContent() {
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const { hasCompletedSetup, isHydrated } = useOrder()
  const searchParams = useSearchParams()
  const hasScrolled = useRef(false)

  // Handle scrollTo query param (when navigating from another page)
  useEffect(() => {
    const scrollTo = searchParams.get('scrollTo')
    if (scrollTo && hasCompletedSetup && isHydrated && !hasScrolled.current) {
      hasScrolled.current = true
      // Small delay to let the page render fully
      const timer = setTimeout(() => {
        const el = document.getElementById(scrollTo)
        if (el) {
          const navbarHeight = 64
          const elementPosition = el.getBoundingClientRect().top + window.scrollY
          window.scrollTo({
            top: elementPosition - navbarHeight,
            behavior: 'smooth',
          })
        }
        // Clean up URL using native history API — does NOT trigger Next.js router re-render
        window.history.replaceState(window.history.state, '', '/')
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [searchParams, hasCompletedSetup, isHydrated])

  // Show nothing until hydrated to prevent welcome screen flash
  if (!isHydrated) {
    return null
  }

  if (!hasCompletedSetup) {
    return <WelcomeScreen />
  }

  return (
    <>
      <Navbar onItemClick={setSelectedItem} />
      <main>
        <div data-scroll-animate="fade-in-up">
          <Hero />
        </div>
        <div data-scroll-animate="fade-in-up" data-scroll-delay="0.1s">
          <Categories />
        </div>
        <div data-scroll-animate="fade-in-up" data-scroll-delay="0.2s">
          <MealSuggester onItemClick={setSelectedItem} />
        </div>
        <div data-scroll-animate="fade-in-up" data-scroll-delay="0.3s">
          <PopularItems onItemClick={setSelectedItem} />
        </div>
        <div data-scroll-animate="fade-in-up" data-scroll-delay="0.4s">
          <Promotions onDealClick={setSelectedDeal} />
        </div>
        <div data-scroll-animate="fade-in-up" data-scroll-delay="0.5s">
          <Reviews />
        </div>
        <div data-scroll-animate="fade-in-up" data-scroll-delay="0.6s">
          <Contact />
        </div>
      </main>
      <Footer />
      <CartDrawer onItemClick={setSelectedItem} />
      {selectedItem && (
        <ProductModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
      {selectedDeal && (
        <DealModal
          deal={selectedDeal}
          onClose={() => setSelectedDeal(null)}
        />
      )}
    </>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomePageContent />
    </Suspense>
  )
}
