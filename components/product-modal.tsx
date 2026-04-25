"use client"

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { X, Plus, Minus, ShoppingBag, Check, Star } from 'lucide-react'
import type { MenuItem, AddOn } from '@/lib/menu-data'
import { getAddOnsForCategory, drinkOptions } from '@/lib/menu-data'
import { useCart } from '@/lib/cart-context'
import { toast } from '@/lib/notify'
import { setStorageWithSync } from '@/lib/storage-sync'

interface ProductModalProps {
  item: MenuItem
  onClose: () => void
}

export function ProductModal({ item, onClose }: ProductModalProps) {
  const [quantity, setQuantity] = useState(1)
  const [selectedAddOns, setSelectedAddOns] = useState<AddOn[]>([])
  const [selectedDrink, setSelectedDrink] = useState<string>('')
  const [userRating, setUserRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [hasRated, setHasRated] = useState(false)
  const [averageRating, setAverageRating] = useState(item.rating)
  const [ratingCount, setRatingCount] = useState(Math.floor(Math.random() * 50) + 20)
  const [specialInstructions, setSpecialInstructions] = useState('')
  const { addItem } = useCart()

  const availableAddOns = getAddOnsForCategory(item.category)
  const isSoftDrinkItem = item.category === 'drinks' && /soft drink/i.test(item.name)
  const showDrinkSelector = isSoftDrinkItem || selectedAddOns.some((a) => a.id === 'add-cold-drink')

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Load persisted rating from localStorage
  useEffect(() => {
    try {
      const savedRatings = JSON.parse(localStorage.getItem('productRatings') || '{}') as
        Record<string, { total: number; count: number; average: number }>
      const saved = savedRatings[item.id]
      if (saved && saved.count > 0) {
        setAverageRating(saved.average)
        setRatingCount(saved.count)
      }
      const ratedItems: string[] = JSON.parse(localStorage.getItem('ratedProducts') || '[]')
      if (ratedItems.includes(item.id)) setHasRated(true)
    } catch {}
  }, [item.id])

  const toggleAddOn = (addOn: AddOn) => {
    setSelectedAddOns((prev) => {
      const exists = prev.find((a) => a.id === addOn.id)
      if (exists) {
        // If removing cold drink, also clear drink selection
        if (addOn.id === 'add-cold-drink') {
          setSelectedDrink('')
        }
        return prev.filter((a) => a.id !== addOn.id)
      }
      // For single/double patty, they are mutually exclusive
      if (addOn.id === 'single-patty') {
        return [...prev.filter((a) => a.id !== 'double-patty'), addOn]
      }
      if (addOn.id === 'double-patty') {
        return [...prev.filter((a) => a.id !== 'single-patty'), addOn]
      }
      return [...prev, addOn]
    })
  }

  const handleSubmitRating = () => {
    if (userRating === 0) return
    try {
      const savedRatings = JSON.parse(localStorage.getItem('productRatings') || '{}') as
        Record<string, { total: number; count: number; average: number }>
      const existing = savedRatings[item.id] ?? { total: averageRating * ratingCount, count: ratingCount }
      const newCount = existing.count + 1
      const newTotal = existing.total + userRating
      const newAvg = Math.round((newTotal / newCount) * 10) / 10
      savedRatings[item.id] = { total: newTotal, count: newCount, average: newAvg }
      setStorageWithSync('productRatings', JSON.stringify(savedRatings))
      const ratedItems: string[] = JSON.parse(localStorage.getItem('ratedProducts') || '[]')
      if (!ratedItems.includes(item.id)) {
        ratedItems.push(item.id)
        localStorage.setItem('ratedProducts', JSON.stringify(ratedItems))
      }
      setAverageRating(newAvg)
      setRatingCount(newCount)
    } catch {}
    setHasRated(true)
    toast.success('Thank you for your rating!')
  }

  const addOnTotal = selectedAddOns.reduce((sum, a) => sum + a.price, 0)
  const itemTotal = (item.price + addOnTotal) * quantity

  const addConfiguredItemToCart = () => {
    if (showDrinkSelector && !selectedDrink) {
      toast.error('Please choose Pepsi, 7UP, or Mirinda')
      return
    }

    const drinkAddon = selectedDrink
      ? [{ id: `drink-${selectedDrink}`, name: `Drink: ${drinkOptions.find(d => d.id === selectedDrink)?.name}`, price: 0 }]
      : []

    addItem({
      menuItem: item,
      quantity,
      addOns: [
        ...selectedAddOns.map((a) => ({ id: a.id, name: a.name, price: a.price })),
        ...drinkAddon,
      ],
      specialInstructions: specialInstructions || undefined,
    })
    toast.success(`${item.name} added to cart!`)
    onClose()
  }

  const handleAddToCart = () => {
    addConfiguredItemToCart()
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-brand-dark/70 p-4 backdrop-blur-sm fade-in-up"
        onClick={onClose}
      >
        <div
          className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-card shadow-2xl max-h-[90vh] scale-in border border-border/50"
          role="dialog"
          aria-modal="true"
          aria-label={`${item.name} details`}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-brand-dark/50 text-primary-foreground backdrop-blur-md transition-all duration-300 hover:bg-brand-dark/80 hover:scale-110 active:scale-95 border border-white/10"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Scrollable content */}
        <div className="overflow-y-auto">
          {/* Image */}
          <div className="relative h-64 w-full flex-shrink-0 overflow-hidden bg-gradient-to-br from-muted/50 to-muted/30">
            <Image
              src={item.image}
              alt={item.name}
              fill
              className="object-cover transition-transform duration-500 hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/60 via-transparent to-transparent" />
            
            {/* Rating badge on image */}
            <div className="absolute left-4 bottom-4 flex items-center gap-2 rounded-full bg-brand-dark/80 backdrop-blur-md px-4 py-2 border border-white/20 shadow-lg animate-pulse">
              <Star className="h-5 w-5 fill-brand-gold text-brand-gold" />
              <span className="text-sm font-bold text-primary-foreground">{averageRating}</span>
              <span className="text-xs text-primary-foreground/70">({ratingCount})</span>
            </div>
          </div>

          {/* Content */}
          <div className="p-7">
            <div className="mb-2 flex items-start justify-between gap-4">
              <h2 className="text-2xl font-bold text-foreground leading-tight">{item.name}</h2>
              <span className="flex-shrink-0 text-2xl font-bold bg-gradient-to-r from-brand-red to-[#A00D1B] bg-clip-text text-transparent">
                Rs. {item.price.toLocaleString()}
              </span>
            </div>
            <p className="mb-6 text-sm leading-relaxed text-muted-foreground">{item.description}</p>

            {/* Star Rating System */}
            <div className="mb-5 rounded-xl border border-border bg-background p-4">
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-foreground">
                Rate this item
              </h3>
              {hasRated ? (
                <p className="text-sm text-brand-red font-medium">Thanks for your rating!</p>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setUserRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-0.5 transition-transform hover:scale-110"
                        aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                      >
                        <Star
                          className={`h-6 w-6 transition-colors ${
                            star <= (hoverRating || userRating)
                              ? 'fill-brand-gold text-brand-gold'
                              : 'fill-muted text-muted'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  {userRating > 0 && (
                    <button
                      onClick={handleSubmitRating}
                      className="rounded-full bg-brand-red px-3 py-1 text-xs font-semibold text-primary-foreground transition-colors hover:bg-brand-red/90"
                    >
                      Submit
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Add-ons / Customizations */}
            {availableAddOns.length > 0 && (
              <div className="mb-5">
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-foreground">
                  {item.category === 'beef-burgers' || item.category === 'chicken-burgers'
                    ? 'Customize Your Burger'
                    : isSoftDrinkItem
                      ? 'Choose Your Flavor'
                      : 'Add-ons'}
                </h3>
                <div className="space-y-2">
                  {availableAddOns.map((addOn) => {
                    const isSelected = selectedAddOns.some((a) => a.id === addOn.id)
                    return (
                      <button
                        key={addOn.id}
                        onClick={() => toggleAddOn(addOn)}
                        className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all ${
                          isSelected
                            ? 'border-brand-red bg-brand-red/5'
                            : 'border-border bg-background hover:bg-muted'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
                              isSelected
                                ? 'border-brand-red bg-brand-red'
                                : 'border-border'
                            }`}
                          >
                            {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                          </div>
                          <span className="text-sm font-medium text-foreground">{addOn.name}</span>
                        </div>
                        <span className="text-sm font-semibold text-brand-red">
                          {addOn.price === 0 ? 'Included' : `+Rs. ${addOn.price}`}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Drink Selector */}
            {showDrinkSelector && (
              <div className="mb-5">
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-foreground">
                  Choose Your Flavor
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {drinkOptions.map((drink) => (
                    <button
                      key={drink.id}
                      onClick={() => setSelectedDrink(drink.id)}
                      className={`flex flex-col items-center rounded-xl border px-3 py-3 transition-all ${
                        selectedDrink === drink.id
                          ? 'border-brand-red bg-brand-red/5 ring-1 ring-brand-red'
                          : 'border-border bg-background hover:bg-muted'
                      }`}
                    >
                      <span className={`text-sm font-semibold ${selectedDrink === drink.id ? 'text-brand-red' : 'text-foreground'}`}>
                        {drink.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Special Instructions */}
            <div className="mb-5">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-foreground">
                Special Instructions
              </h3>
              <textarea
                rows={2}
                placeholder="Any special requests? (e.g., no onions, extra sauce)"
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
              />
            </div>

            {/* Quantity */}
            <div className="mb-5 flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">Quantity</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-muted"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-6 text-center text-lg font-bold text-foreground">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-muted"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Add to Cart Button */}
        <div className="flex-shrink-0 border-t border-border bg-card p-4">
          <button
            onClick={handleAddToCart}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-red py-3.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-brand-red/90 active:scale-[0.98]"
          >
            <ShoppingBag className="h-4 w-4" />
            Add to Cart - Rs. {itemTotal.toLocaleString()}
          </button>
        </div>
        </div>
      </div>
    </>
  )
}
