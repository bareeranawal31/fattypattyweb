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

export function Categories() {
  const router = useRouter()
  const [categories, setCategories] = useState<CategoryCard[]>([])

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch('/api/menu', { cache: 'no-store' })
        const responseText = await response.text()
        if (!response.ok) {
          throw new Error(`Failed to fetch menu categories: ${response.status}`)
        }
        let data: any
        try {
          data = JSON.parse(responseText)
        } catch (error) {
          throw new Error('Invalid JSON response from /api/menu')
        }

        const apiItems = (data.data?.items || []) as Array<Record<string, unknown>>
        const itemCounts = new Map<string, number>()

        apiItems.forEach((item) => {
          const categoryId = ((item.category_id as string) || ((item.category as { id?: string })?.id as string) || 'other').toString()
          itemCounts.set(categoryId, (itemCounts.get(categoryId) || 0) + 1)
        })

        if (data.data?.categories && data.data.categories.length > 0) {
          const apiCategoryRows = data.data.categories as Array<{
            id: string
            name?: string
            image?: string
            image_url?: string
            display_order?: number
            sort_order?: number
          }>
          const apiCategories: CategoryCard[] = sortCategories(apiCategoryRows).map((cat) => ({
            id: cat.id || 'other',
            name: cat.name || 'Other',
            image: cat.image || cat.image_url || '/images/placeholder.jpg',
            count: itemCounts.get(cat.id || 'other') || 0,
          }))
          setCategories(apiCategories)
          return
        }
      } catch {
        setCategories([])
      }
    }

    loadCategories()
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
                {i + 1}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
