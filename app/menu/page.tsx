"use client"

import { useState } from 'react'
import { Navbar } from '@/components/navbar'
import { MenuSection } from '@/components/menu-section'
import { Footer } from '@/components/footer'
import { CartDrawer } from '@/components/cart-drawer'
import { ProductModal } from '@/components/product-modal'
import { WelcomeScreen } from '@/components/welcome-screen'
import { useOrder } from '@/lib/order-context'
import type { MenuItem } from '@/lib/menu-data'

export default function MenuPage() {
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const { hasCompletedSetup, isHydrated } = useOrder()

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
      <main className="pt-14">
        <MenuSection onItemClick={setSelectedItem} />
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
