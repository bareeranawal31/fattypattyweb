"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Search, ShoppingBag, Menu, X, Info, Sun, Moon, MapPin, Store, UserRound } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useCart } from '@/lib/cart-context'
import { useOrder } from '@/lib/order-context'
import { useCustomerAuth } from '@/lib/customer-auth-context'
import { useAdminSettings } from '@/lib/admin-settings'
import { menuItems } from '@/lib/menu-data'
import type { MenuItem } from '@/lib/menu-data'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/notify'

type NavLink = {
  name: string
  href: string
  type: 'route' | 'scroll' | 'modal'
  scrollTarget?: string
}

const navLinks: NavLink[] = [
  { name: 'Home', href: '/', type: 'route' },
  { name: 'Menu', href: '/menu', type: 'route' },
  { name: 'Deals', href: '/#deals', type: 'scroll', scrollTarget: 'deals' },
  { name: 'Track Order', href: '/track', type: 'route' },
  { name: 'About Us', href: '#about', type: 'modal' },
]

interface NavbarProps {
  onItemClick?: (item: MenuItem) => void
}

export function Navbar({ onItemClick }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAbout, setShowAbout] = useState(false)
  const { totalItems, setIsCartOpen } = useCart()
  const { user } = useCustomerAuth()
  const { orderType, setOrderType, setSelectedArea, setSelectedBranch, setHasCompletedSetup } = useOrder()
  const settings = useAdminSettings()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) searchInputRef.current.focus()
  }, [isSearchOpen])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false)
        setSearchQuery('')
      }
    }
    if (isSearchOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isSearchOpen])

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    const query = searchQuery.toLowerCase()
    return menuItems.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
    ).slice(0, 6)
  }, [searchQuery])

  const handleResultClick = (item: MenuItem) => {
    setIsSearchOpen(false)
    setSearchQuery('')
    if (onItemClick) onItemClick(item)
  }

  const toggleTheme = () => {
    document.documentElement.classList.add('transitioning')
    setTheme(theme === 'dark' ? 'light' : 'dark')
    setTimeout(() => document.documentElement.classList.remove('transitioning'), 350)
  }

  const handleToggleOrderType = (type: 'delivery' | 'pickup') => {
    if (!settings.isAcceptingOrders) {
      toast.error('Ordering is temporarily disabled')
      return
    }

    if (type === 'delivery' && !settings.isDeliveryEnabled) {
      toast.error('Delivery is currently unavailable')
      return
    }

    if (type === 'pickup' && !settings.isPickupEnabled) {
      toast.error('Pickup is currently unavailable')
      return
    }

    if (type === orderType) {
      toast.info(`You already selected ${type}.`)
      return
    }

    setOrderType(type)

    // Force setup to reopen so customer selects area/branch for the new mode.
    setSelectedArea('')
    setSelectedBranch(null)
    setHasCompletedSetup(false)

    if (pathname !== '/') {
      router.push('/')
    }
  }

  const scrollToSection = useCallback((sectionId: string) => {
    const el = document.getElementById(sectionId)
    if (el) {
      const navbarHeight = 64
      const elementPosition = el.getBoundingClientRect().top + window.scrollY
      window.scrollTo({
        top: elementPosition - navbarHeight,
        behavior: 'smooth',
      })
    }
  }, [])

  const handleNavClick = useCallback((link: NavLink, e: React.MouseEvent) => {
    e.preventDefault()
    setIsMobileMenuOpen(false)

    if (link.type === 'modal') {
      setShowAbout(true)
      return
    }

    if (link.type === 'route' && link.href === '/') {
      if (pathname === '/') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        router.push('/')
      }
      return
    }

    if (link.type === 'route') {
      router.push(link.href)
      return
    }

    if (link.type === 'scroll' && link.scrollTarget) {
      if (pathname === '/') {
        scrollToSection(link.scrollTarget)
      } else {
        router.push(`/?scrollTo=${link.scrollTarget}`)
      }
    }
  }, [pathname, router, scrollToSection])

  return (
    <>
      <nav
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          isScrolled
            ? 'bg-[#C1121F]/95 backdrop-blur-md shadow-lg'
            : 'bg-[#C1121F]'
        )}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2 sm:px-4 lg:px-8">
          {/* Left: Logo + Delivery/Pickup Toggle */}
          <div className="flex flex-shrink-0 items-center gap-2.5 sm:gap-3">
            <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
              <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-full border-2 border-[#F4A261]/40 sm:h-10 sm:w-10">
                <Image
                  src="/images/logo.png"
                  alt="Fatty Patty"
                  width={80}
                  height={80}
                  className="h-full w-full object-cover"
                  priority
                />
              </div>
              <span className="hidden font-serif text-lg font-bold text-white sm:block">
                {settings.storeName}
              </span>
            </Link>

            {/* Delivery / Pickup Toggle (Pill Style) */}
            <div className="hidden items-center sm:flex">
              <div className="flex rounded-full border border-white/20 bg-white/10 p-0.5">
                <button
                  onClick={() => handleToggleOrderType('delivery')}
                  disabled={!settings.isAcceptingOrders || !settings.isDeliveryEnabled}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40',
                    orderType === 'delivery'
                      ? 'bg-white text-[#C1121F] shadow-sm'
                      : 'text-white/70 hover:text-white'
                  )}
                >
                  <MapPin className="h-3 w-3" />
                  Delivery
                </button>
                <button
                  onClick={() => handleToggleOrderType('pickup')}
                  disabled={!settings.isAcceptingOrders || !settings.isPickupEnabled}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40',
                    orderType === 'pickup'
                      ? 'bg-white text-[#C1121F] shadow-sm'
                      : 'text-white/70 hover:text-white'
                  )}
                >
                  <Store className="h-3 w-3" />
                  Pickup
                </button>
              </div>
            </div>
          </div>

          {/* Center: Desktop Nav */}
          <div className="hidden items-center gap-5 lg:flex">
            {navLinks.map((link) => (
              <button
                key={link.name}
                onClick={(e) => handleNavClick(link, e)}
                className="text-sm font-medium tracking-wide text-white/80 transition-colors hover:text-[#F4A261]"
              >
                {link.name}
              </button>
            ))}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-1">
            {/* Theme Toggle */}
            {mounted && (
              <button
                onClick={toggleTheme}
                className="hidden rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white md:inline-flex"
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
              </button>
            )}

            {/* Search */}
            <div ref={searchContainerRef} className="relative">
              {isSearchOpen ? (
                <div className="flex items-center">
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search menu..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') { setIsSearchOpen(false); setSearchQuery('') }
                    }}
                    className="w-32 rounded-full bg-white/15 px-3.5 py-1.5 text-sm text-white placeholder:text-white/50 focus:bg-white/20 focus:outline-none sm:w-48 lg:w-52"
                  />
                  <button
                    onClick={() => { setIsSearchOpen(false); setSearchQuery('') }}
                    className="ml-1 rounded-full p-1.5 text-white/80 hover:text-white"
                    aria-label="Close search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  {searchQuery.trim() && (
                    <div className="absolute right-0 top-full mt-2 w-[calc(100vw-1rem)] max-w-sm overflow-hidden rounded-xl border border-border bg-card shadow-xl sm:w-80">
                      {searchResults.length > 0 ? (
                        <div className="max-h-80 overflow-y-auto">
                          {searchResults.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => handleResultClick(item)}
                              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted"
                            >
                              <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg">
                                <Image src={item.image} alt={item.name} fill className="object-cover" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                              </div>
                              <span className="flex-shrink-0 text-sm font-bold text-[#C1121F]">
                                Rs. {item.price.toLocaleString()}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="px-4 py-6 text-center">
                          <p className="text-sm text-muted-foreground">No items found</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Search menu"
                >
                  <Search className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Cart */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Shopping cart"
            >
              <ShoppingBag className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#F4A261] text-xs font-bold text-[#1a1a1a]">
                  {totalItems}
                </span>
              )}
            </button>

            <Link
              href={user ? '/profile' : '/auth/customer'}
              className="hidden items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white md:inline-flex"
            >
              <UserRound className="h-4 w-4" />
              {user ? 'Profile' : 'Sign In'}
            </Link>

            {/* Mobile Menu Toggle */}
            <button
              className="rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 lg:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={cn(
            'overflow-hidden transition-all duration-300 lg:hidden',
            isMobileMenuOpen ? 'max-h-[620px] opacity-100 dropdown-open' : 'max-h-0 opacity-0'
          )}
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-3 pb-4 pt-1 sm:px-4">
            {/* Mobile Delivery/Pickup Toggle */}
            <div className="mb-2 flex rounded-full border border-white/20 bg-white/10 p-0.5">
              <button
                onClick={() => handleToggleOrderType('delivery')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-all',
                  orderType === 'delivery' ? 'bg-white text-[#C1121F]' : 'text-white/70'
                )}
              >
                <MapPin className="h-3 w-3" />
                Delivery
              </button>
              <button
                onClick={() => handleToggleOrderType('pickup')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-all',
                  orderType === 'pickup' ? 'bg-white text-[#C1121F]' : 'text-white/70'
                )}
              >
                <Store className="h-3 w-3" />
                Pickup
              </button>
            </div>

            {navLinks.map((link) => (
              <button
                key={link.name}
                onClick={(e) => handleNavClick(link, e)}
                className="rounded-lg px-4 py-3 text-left text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                {link.name}
              </button>
            ))}

            <Link
              href={user ? '/profile' : '/auth/customer'}
              className="rounded-lg px-4 py-2.5 text-left text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {user ? 'Profile' : 'Sign In'}
            </Link>
          </div>
        </div>
      </nav>

      {/* About Us Modal */}
      {showAbout && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-[#1a1a1a]/60 p-4 backdrop-blur-sm"
          onClick={() => setShowAbout(false)}
        >
          <div
            className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-card shadow-2xl animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="About Fatty Patty"
          >
            <button
              onClick={() => setShowAbout(false)}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-[#1a1a1a]/50 text-white backdrop-blur-sm transition-colors hover:bg-[#1a1a1a]/70"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="bg-[#C1121F] px-8 pb-6 pt-8 text-center">
              <div className="mx-auto mb-4 h-20 w-20 overflow-hidden rounded-full border-3 border-[#F4A261]/40">
                <Image
                  src="/images/logo.png"
                  alt="Fatty Patty"
                  width={80}
                  height={80}
                  className="h-full w-full object-cover"
                />
              </div>
              <h2 className="font-serif text-2xl font-bold text-white">About Fatty Patty</h2>
              <span className="mt-1 inline-block text-sm text-white/70">Established 2020</span>
            </div>
            <div className="p-8">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Established in 2020, Fatty Patty is dedicated to delivering bold flavors and premium quality fast food. From juicy burgers to satisfying bowls and crispy tenders, we focus on freshness, taste, and consistency. Our mission is simple: serve happiness in every bite.
              </p>
              <div className="mt-6 flex items-center gap-3">
                <Info className="h-5 w-5 flex-shrink-0 text-[#C1121F]" />
                <div>
                  <p className="text-xs font-semibold text-foreground">Our Locations</p>
                  <p className="text-xs text-muted-foreground">{"Creek Walk DHA Phase 8 \u2022 Habit City Tipu Sultan"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
