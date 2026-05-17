"use client"

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { MenuItem } from '@/lib/menu-data'
import { SignInBenefitsPrompt } from '@/components/signin-benefits-prompt'
import { useCustomerAuth } from '@/lib/customer-auth-context'

interface MealSuggesterProps {
  onItemClick: (item: MenuItem) => void
}

const suggestionCategories = [
  { id: 'starters', label: 'Starters' },
  { id: 'beef-burgers', label: 'Beef Burgers' },
  { id: 'chicken-burgers', label: 'Chicken Burgers' },
  { id: 'bowls', label: 'Bowls' },
  { id: 'pasta', label: 'Pasta' },
  { id: 'fries', label: 'Fries Specials' },
  { id: 'drinks', label: 'Drinks' },
]

const fallbackImage = '/images/placeholder.jpg'

export function MealSuggester({ onItemClick }: MealSuggesterProps) {
  const router = useRouter()
  const { user } = useCustomerAuth()
  const [selectedCategory, setSelectedCategory] = useState<string>('starters')
  const [suggestion, setSuggestion] = useState<MenuItem | null>(null)
  const [pendingQuickAddItem, setPendingQuickAddItem] = useState<MenuItem | null>(null)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [isAnimating, setIsAnimating] = useState(false)
  const lastShownIndexRef = useRef<Record<string, number>>({})
  const cardRef = useRef<HTMLDivElement>(null)
  const categorySelectRef = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    const loadMenuItems = async () => {
      try {
        const response = await fetch('/api/menu', { cache: 'no-store' })
        if (!response.ok) {
          throw new Error(`Failed to fetch menu data: ${response.status}`)
        }

        const payload = await response.json()
        const apiItems = (payload?.data?.items || []) as Array<Record<string, unknown>>
        const mapped: MenuItem[] = apiItems.map((item) => ({
          id: String(item.id || ''),
          name: String(item.name || ''),
          description: String(item.description || ''),
          price: Number(item.price || 0),
          category: String(item.category_id || (item.category as { id?: string } | undefined)?.id || 'other'),
          image: String(item.image || item.image_url || fallbackImage),
          rating: Number(item.rating || 4.5),
          popular: Boolean(item.is_popular || item.is_featured),
        }))

        setMenuItems(mapped)
      } catch {
        setMenuItems([])
      }
    }

    void loadMenuItems()
    const interval = setInterval(loadMenuItems, 30000)
    return () => clearInterval(interval)
  }, [])

  const suggestDish = () => {
    const dishes = menuItems.filter((item) => item.category === selectedCategory)
    if (!dishes || dishes.length === 0) return

    // Get random dish, never repeat the same one twice in a row
    let randomIndex
    do {
      randomIndex = Math.floor(Math.random() * dishes.length)
    } while (
      dishes.length > 1 &&
      randomIndex === lastShownIndexRef.current[selectedCategory]
    )

    lastShownIndexRef.current[selectedCategory] = randomIndex
    setIsAnimating(false)

    // Trigger reflow and animation
    setTimeout(() => {
      setSuggestion(dishes[randomIndex])
      setIsAnimating(true)

      // Smooth scroll to card
      if (cardRef.current) {
        cardRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" })
      }
    }, 10)
  }

  const openCategoryDropdown = () => {
    if (!categorySelectRef.current) return

    categorySelectRef.current.focus()
    if ('showPicker' in categorySelectRef.current) {
      ;(categorySelectRef.current as HTMLSelectElement & { showPicker: () => void }).showPicker()
    }
  }

  return (
    <>
      <section className="decide-section meal-suggester">
        <div className="decide-container">

          {/* Header */}
          <div className="decide-header">
            <span className="decide-emoji">🤔</span>
            <h2 className="decide-title">Can't Decide What to Eat?</h2>
            <p className="decide-subtitle">
              Tell us what you're in the mood for and we'll pick something delicious!
            </p>
          </div>

          {/* Controls */}
          <div className="decide-controls">
            <div className="dropdown-wrapper">
              <label htmlFor="categorySelect" className="dropdown-label">
                Pick a category:
              </label>
              <div className="custom-select-wrapper">
                <select
                  id="categorySelect"
                  ref={categorySelectRef}
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="custom-select"
                >
                  {suggestionCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={openCategoryDropdown}
                  aria-label="Open category dropdown"
                  className="select-arrow-btn"
                >
                  <span className="select-arrow">▼</span>
                </button>
              </div>
            </div>

            <button
              onClick={suggestDish}
              className="suggest-btn"
            >
              Suggest Something! 🍽️
            </button>
          </div>

          {/* Suggestion Card */}
          {suggestion && (
            <div
              ref={cardRef}
              className={`suggestion-card ${isAnimating ? 'animate' : ''}`}
            >
              <div className="card-category-badge">
                {suggestionCategories.find((category) => category.id === suggestion.category)?.label || suggestion.category}
              </div>
              <div className="card-body">
                <h3 className="card-dish-name">{suggestion.name}</h3>
                <p className="card-description">{suggestion.description}</p>
                <div className="card-footer">
                  <span className="card-price">Rs. {suggestion.price.toLocaleString()}</span>
                  <button
                    type="button"
                    className="card-order-btn"
                    onClick={() => {
                      const itemToAdd = { ...suggestion, image: suggestion.image || fallbackImage }
                      if (user) {
                        // Logged in: directly open product detail
                        onItemClick(itemToAdd)
                      } else {
                        // Not logged in: show sign in / continue as guest prompt
                        setPendingQuickAddItem(itemToAdd)
                      }
                    }}
                  >
                    Add to Cart 🛒
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <SignInBenefitsPrompt
        open={Boolean(pendingQuickAddItem)}
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
    </>
  )
}
