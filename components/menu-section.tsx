"use client"

import { useState, useMemo, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { Star } from 'lucide-react'
import { menuItems as defaultMenuItems, categories as defaultCategories } from '@/lib/menu-data'
import type { MenuItem, Category } from '@/lib/menu-data'
import { SignInBenefitsPrompt } from '@/components/signin-benefits-prompt'
import { useCustomerAuth } from '@/lib/customer-auth-context'
import { cn } from '@/lib/utils'

interface MenuSectionProps {
  onItemClick: (item: MenuItem) => void
}

interface StoredMenuItem {
  id: string
  name: string
  description?: string
  price: number
  category?: string
  category_id?: string
  category_name?: string
  image?: string
  image_url?: string
  rating?: number
  is_popular?: boolean
  is_featured?: boolean
  is_available?: boolean
}

function formatCategoryName(categoryId: string): string {
  return categoryId
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function buildCategoriesFromStoredProducts(products: StoredMenuItem[]): Category[] {
  const categoryMap = new Map<string, Category>()

  products.forEach((product) => {
    const id = (product.category_id || product.category || 'other').toString()
    const existing = categoryMap.get(id)
    if (existing) {
      existing.count += 1
      return
    }

    categoryMap.set(id, {
      id,
      name: product.category_name || formatCategoryName(id),
      image: (product.image as string) || (product.image_url as string) || '/images/placeholder.jpg',
      count: 1,
    })
  })

  return Array.from(categoryMap.values())
}

function mapStoredProductToMenuItem(product: StoredMenuItem): MenuItem {
  return {
    id: product.id,
    name: product.name,
    description: product.description || '',
    price: product.price,
    category: (product.category_id || product.category || 'other').toString(),
    image: (product.image as string) || (product.image_url as string) || '/images/placeholder.jpg',
    rating: product.rating || 4.5,
    popular: product.is_popular || product.is_featured || false,
  }
}

const categoryOrder = new Map(defaultCategories.map((category, index) => [category.id, index]))

function sortCategories<T extends { id: string; display_order?: number; sort_order?: number }>(items: T[]) {
  return [...items].sort((a, b) => {
    const aOrder = Number.isFinite(a.display_order as number)
      ? Number(a.display_order)
      : Number.isFinite(a.sort_order as number)
        ? Number(a.sort_order)
        : (categoryOrder.get(a.id) ?? 9999)
    const bOrder = Number.isFinite(b.display_order as number)
      ? Number(b.display_order)
      : Number.isFinite(b.sort_order as number)
        ? Number(b.sort_order)
        : (categoryOrder.get(b.id) ?? 9999)
    return aOrder - bOrder
  })
}

export function MenuSection({ onItemClick }: MenuSectionProps) {
  const router = useRouter()
  const { user } = useCustomerAuth()
  const searchParams = useSearchParams()
  const initialCategory = searchParams.get('category') || 'all'
  const [activeCategory, setActiveCategory] = useState<string>(initialCategory)
  const [pendingQuickAddItem, setPendingQuickAddItem] = useState<MenuItem | null>(null)
  const [menuItems, setMenuItems] = useState<MenuItem[]>(defaultMenuItems)
  const [categories, setCategories] = useState<Category[]>(defaultCategories)
  const [productRatings, setProductRatings] = useState<Record<string, number>>({})

  // Load products from API with localStorage fallback
  useEffect(() => {
    const loadProducts = async () => {
      try {
        // Try to fetch from API first
        const response = await fetch('/api/menu', { cache: 'no-store' })
        const responseText = await response.text()
        if (!response.ok) {
          throw new Error(`Failed to fetch menu data: ${response.status}`)
        }
        let data: any
        try {
          data = JSON.parse(responseText)
        } catch (error) {
          throw new Error('Invalid JSON response from /api/menu')
        }

        if (data.data?.items && data.data.items.length > 0) {
          // Convert API items to MenuItem format
          const convertedProducts: MenuItem[] = data.data.items.map((item: Record<string, unknown>) => ({
            id: item.id as string,
            name: item.name as string,
            description: (item.description as string) || '',
            price: item.price as number,
            category: (item.category_id as string) || (item.category ? (item.category as any).id : 'other'),
            image: (item.image as string) || (item.image_url as string) || '/images/placeholder.jpg',
            rating: (item.rating as number) || 4.5,
            popular: (item.is_popular as boolean) || (item.is_featured as boolean) || false,
          }))

          const itemCounts = new Map<string, number>()
          convertedProducts.forEach((item) => {
            itemCounts.set(item.category, (itemCounts.get(item.category) || 0) + 1)
          })

          if (data.data?.categories && data.data.categories.length > 0) {
            const apiCategories: Category[] = sortCategories(data.data.categories as Array<Record<string, unknown>>).map((cat: Record<string, unknown>) => {
              const categoryId = cat.id as string
              return {
                id: categoryId,
                name: cat.name as string,
                image: (cat.image as string) || (cat.image_url as string) || '/images/placeholder.jpg',
                count: itemCounts.get(categoryId) || 0,
              }
            })
            setCategories(apiCategories)
          } else {
            const derivedProducts: StoredMenuItem[] = convertedProducts.map((item) => ({
              id: item.id,
              name: item.name,
              description: item.description,
              price: item.price,
              category_id: item.category,
              image: item.image,
              rating: item.rating,
              is_popular: item.popular,
            }))
            setCategories(buildCategoriesFromStoredProducts(derivedProducts))
          }

          setMenuItems(convertedProducts)
          return
        }
      } catch (error) {
        console.error('[v0] Error fetching from API, falling back to localStorage:', error)
      }
      
      // Fallback to localStorage if API fails - check both menuItems and legacy products key
      const storedProducts = localStorage.getItem('menuItems') || localStorage.getItem('products')
      if (storedProducts) {
        try {
          const products = JSON.parse(storedProducts) as StoredMenuItem[]
          const convertedProducts: MenuItem[] = products
            .filter((p: Record<string, unknown>) => p.is_available !== false)
            .map((p: StoredMenuItem) => mapStoredProductToMenuItem(p))
          if (convertedProducts.length > 0) {
            setMenuItems(convertedProducts)
            setCategories(sortCategories(buildCategoriesFromStoredProducts(products)))
          }
        } catch (error) {
          console.error('[v0] Error loading products from localStorage:', error)
        }
      }
    }
    
    loadProducts()
    
    // Set up interval to refresh from API every 30 seconds
    const interval = setInterval(loadProducts, 30000)
    
    // Listen for storage changes (admin updates)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'menuItems' || e.key === 'products') {
        // Immediately update from localStorage
        const storedProducts = localStorage.getItem('menuItems') || localStorage.getItem('products')
        if (storedProducts) {
          try {
            const products = JSON.parse(storedProducts) as StoredMenuItem[]
            const convertedProducts: MenuItem[] = products
              .filter((p: Record<string, unknown>) => p.is_available !== false)
              .map((p: StoredMenuItem) => mapStoredProductToMenuItem(p))
            if (convertedProducts.length > 0) {
              setMenuItems(convertedProducts)
              setCategories(sortCategories(buildCategoriesFromStoredProducts(products)))
            }
          } catch (error) {
            console.error('[v0] Error loading products from localStorage on change:', error)
          }
        }
        // Then refresh from API
        loadProducts()
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

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

  useEffect(() => {
    const cat = searchParams.get('category')
    if (cat) {
      setActiveCategory(cat)
      setTimeout(() => {
        const el = document.getElementById(`category-${cat}`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [searchParams])

  const handleQuickAdd = (e: React.MouseEvent, item: MenuItem) => {
    e.stopPropagation()
    if (user) {
      onItemClick(item)
    } else {
      setPendingQuickAddItem(item)
    }
  }

  const handleCardClick = (item: MenuItem) => {
    if (user) {
      onItemClick(item)
    } else {
      setPendingQuickAddItem(item)
    }
  }

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => activeCategory === 'all' || item.category === activeCategory)
  }, [activeCategory, menuItems])

  const groupedItems = useMemo(() => {
    if (activeCategory !== 'all') {
      return [{ categoryId: activeCategory, items: filteredItems }]
    }
    const groups: { categoryId: string; items: MenuItem[] }[] = []
    categories.forEach((cat) => {
      const items = filteredItems.filter((item) => item.category === cat.id)
      if (items.length > 0) groups.push({ categoryId: cat.id, items })
    })
    return groups
  }, [filteredItems, activeCategory, categories])

  return (
    <>
      <section id="menu" className="site-section bg-background py-14 lg:py-20">
        <div className="site-container px-4 lg:px-8">
        <div className="section-head mb-10">
          <span className="section-kicker justify-center">
            Our Menu
          </span>
          <h2 className="section-title text-balance">
            Explore the Full Menu
          </h2>
        </div>

        {/* Sticky Category Filter */}
        <div className="sticky top-14 z-30 -mx-4 mb-8 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-md">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setActiveCategory('all')}
              className={cn(
                'flex-shrink-0 rounded-full px-5 py-2 text-sm font-medium transition-all',
                activeCategory === 'all'
                  ? 'bg-[#C1121F] text-white shadow-md'
                  : 'bg-card text-foreground hover:bg-muted border border-border'
              )}
            >
              All Items
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  'flex-shrink-0 rounded-full px-5 py-2 text-sm font-medium transition-all',
                  activeCategory === cat.id
                    ? 'bg-[#C1121F] text-white shadow-md'
                    : 'bg-card text-foreground hover:bg-muted border border-border'
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Items */}
        {groupedItems.map((group) => {
          const category = categories.find((c) => c.id === group.categoryId)
          return (
            <div key={group.categoryId} id={`category-${group.categoryId}`} className="mb-12">
              <h3 className="mb-5 flex items-center gap-3 font-serif text-2xl font-bold text-foreground">
                <span className="h-8 w-1 rounded-full bg-[#C1121F]" />
                {category?.name || group.categoryId}
              </h3>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    id={`menu-item-${item.id}`}
                    onClick={() => handleCardClick(item)}
                    className="ui-card group cursor-pointer overflow-hidden rounded-2xl border-border/80 scroll-mt-32"
                  >
                    <div className="relative h-44 w-full overflow-hidden">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={(event) => {
                          const target = event.currentTarget as HTMLImageElement
                          target.src = '/images/placeholder.jpg'
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a]/40 via-transparent to-transparent" />
                      <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-[#1a1a1a]/70 px-2 py-0.5 backdrop-blur-sm">
                        <Star className="h-3 w-3 fill-[#F4A261] text-[#F4A261]" />
                        <span className="text-xs font-semibold text-white">{(productRatings[item.id] ?? item.rating).toFixed(1)}</span>
                      </div>
                      {item.popular && (
                        <span className="absolute left-3 top-3 rounded-full bg-brand-gold px-2.5 py-0.5 text-xs font-bold text-[#1a1a1a]">
                          Best Seller
                        </span>
                      )}
                    </div>

                    <div className="p-4">
                      <h4 className="mb-1 text-base font-bold text-foreground">{item.name}</h4>
                      <p className="mb-3 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                        {item.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-brand-red">
                          Rs. {item.price.toLocaleString()}
                        </span>
                        <button
                          onClick={(e) => handleQuickAdd(e, item)}
                          className="ui-btn-primary flex h-9 min-w-9 items-center justify-center rounded-full px-3 py-0 text-white hover:scale-110 active:scale-95"
                          aria-label={`Add ${item.name} to cart`}
                        >
                          <span aria-hidden="true" className="text-lg leading-none font-bold">+</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {filteredItems.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-lg text-muted-foreground">No items found. Try a different category.</p>
          </div>
        )}
        </div>
      </section>

      <SignInBenefitsPrompt
        open={Boolean(pendingQuickAddItem)}
        onClose={() => setPendingQuickAddItem(null)}
        onSignIn={() => {
          setPendingQuickAddItem(null)
          router.push(`/auth/customer?returnTo=${encodeURIComponent('/menu')}`)
        }}
        onContinueGuest={() => {
          if (pendingQuickAddItem) {
            onItemClick(pendingQuickAddItem)
          }
          setPendingQuickAddItem(null)
        }}
      />
    </>
  )
}
