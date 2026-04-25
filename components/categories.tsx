"use client"

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { categories as defaultCategories } from '@/lib/menu-data'

interface CategoryCard {
  id: string
  name: string
  image: string
  count: number
}

interface StoredMenuItem {
  category?: string
  category_id?: string
  category_name?: string
  image?: string
  image_url?: string
  is_available?: boolean
}

function formatCategoryName(categoryId: string): string {
  return categoryId
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function buildCategoriesFromMenuItems(items: StoredMenuItem[]): CategoryCard[] {
  const categoryMap = new Map<string, CategoryCard>()

  items
    .filter((item) => item.is_available !== false)
    .forEach((item) => {
      const id = (item.category_id || item.category || 'other').toString()
      const existing = categoryMap.get(id)

      if (existing) {
        existing.count += 1
        return
      }

      categoryMap.set(id, {
        id,
        name: item.category_name || formatCategoryName(id),
        image: (item.image as string) || (item.image_url as string) || '/images/placeholder.jpg',
        count: 1,
      })
    })

  return Array.from(categoryMap.values())
}

export function Categories() {
  const router = useRouter()
  const [categories, setCategories] = useState<CategoryCard[]>(defaultCategories)

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch('/api/menu', { cache: 'no-store' })
        if (!response.ok) {
          throw new Error('Failed to fetch menu categories')
        }

        const data = await response.json()
        const apiItems = (data.data?.items || []) as Array<Record<string, unknown>>
        const itemCounts = new Map<string, number>()

        apiItems.forEach((item) => {
          const categoryId = ((item.category_id as string) || ((item.category as { id?: string })?.id as string) || 'other').toString()
          itemCounts.set(categoryId, (itemCounts.get(categoryId) || 0) + 1)
        })

        if (data.data?.categories && data.data.categories.length > 0) {
          const apiCategories: CategoryCard[] = data.data.categories.map((cat: Record<string, unknown>) => ({
            id: (cat.id as string) || 'other',
            name: (cat.name as string) || 'Other',
            image: (cat.image as string) || (cat.image_url as string) || '/images/placeholder.jpg',
            count: itemCounts.get((cat.id as string) || 'other') || 0,
          }))
          setCategories(apiCategories)
          return
        }
      } catch {
        // Fall through to local storage
      }

      const storedMenuItems = localStorage.getItem('menuItems') || localStorage.getItem('products')
      if (!storedMenuItems) {
        return
      }

      try {
        const parsed = JSON.parse(storedMenuItems) as StoredMenuItem[]
        const derived = buildCategoriesFromMenuItems(parsed)
        if (derived.length > 0) {
          setCategories(derived)
        }
      } catch {
        // Keep default categories if parsing fails
      }
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key !== 'menuItems' && e.key !== 'products') {
        return
      }

      const storedMenuItems = localStorage.getItem('menuItems') || localStorage.getItem('products')
      if (!storedMenuItems) {
        return
      }

      try {
        const parsed = JSON.parse(storedMenuItems) as StoredMenuItem[]
        const derived = buildCategoriesFromMenuItems(parsed)
        if (derived.length > 0) {
          setCategories(derived)
        }
      } catch {
        // Keep previous category state if parsing fails
      }
    }

    loadCategories()
    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  const handleClick = (categoryId: string) => {
    router.push(`/menu?category=${categoryId}`)
  }

  return (
    <section id="categories" className="site-section bg-gradient-to-b from-background via-background to-muted/20">
      <div className="site-container">
        <div className="section-head fade-in-up">
          <span className="section-kicker">
            ✨ explore our menu
          </span>
          <h2 className="section-title">
            Browse Categories
          </h2>
          <p className="section-description">Discover our wide selection of premium burgers, sides, and signature dishes</p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-7">
          {categories.map((category, i) => (
            <button
              key={category.id}
              onClick={() => handleClick(category.id)}
              className="ui-card group relative flex flex-col items-center gap-3 p-5 fade-in-up hover:border-brand-red/35"
              style={{ 
                animation: `fadeInUp 0.6s ease-out forwards`,
                animationDelay: `${i * 0.08}s`
              }}
            >
              <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-brand-gold/30 shadow-sm transition-all duration-300 group-hover:border-brand-gold/60">
                <Image
                  src={category.image}
                  alt={category.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <span className="text-center text-sm font-semibold text-foreground transition-colors group-hover:text-brand-red">
                {category.name}
              </span>
              <span className="rounded-full bg-brand-red/10 px-2.5 py-1 text-xs font-semibold text-brand-red">
                {category.count}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
