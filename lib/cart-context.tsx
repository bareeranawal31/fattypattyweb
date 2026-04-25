"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { MenuItem, Deal } from './menu-data'

export interface CartItemAddOn {
  id: string
  name: string
  price: number
}

export interface CartItem {
  id: string // unique cart item id
  type: 'menu_item' | 'deal'
  menuItem?: MenuItem
  deal?: Deal
  dealSelections?: { drinkIndex: number; drinkId: string; drinkName: string }[]
  quantity: number
  addOns: CartItemAddOn[]
  specialInstructions?: string
  unitPrice: number
  totalPrice: number
}

interface CartContextType {
  items: CartItem[]
  addMenuItem: (item: {
    menuItem: MenuItem
    quantity: number
    addOns: CartItemAddOn[]
    specialInstructions?: string
  }) => void
  addDeal: (item: {
    deal: Deal
    quantity: number
    dealSelections: { drinkIndex: number; drinkId: string; drinkName: string }[]
    specialInstructions?: string
  }) => void
  // Legacy addItem for backward compatibility
  addItem: (item: {
    menuItem: MenuItem
    quantity: number
    addOns: CartItemAddOn[]
    specialInstructions?: string
  }) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  totalItems: number
  subtotal: number
  isCartOpen: boolean
  setIsCartOpen: (open: boolean) => void
  isCartHydrated: boolean
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const CART_STORAGE_KEY = 'fatty-patty-cart'

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

function loadCartFromStorage(): CartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(CART_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
    return []
  } catch {
    return []
  }
}

function saveCartToStorage(items: CartItem[]) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  } catch {
    // ignore storage errors
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCartHydrated, setIsCartHydrated] = useState(false)

  // On mount, restore cart from sessionStorage
  useEffect(() => {
    const persisted = loadCartFromStorage()
    if (persisted.length > 0) {
      setItems(persisted)
    }
    setIsCartHydrated(true)
  }, [])

  // Persist cart changes to sessionStorage
  useEffect(() => {
    if (!isCartHydrated) return
    saveCartToStorage(items)
  }, [items, isCartHydrated])

  const addMenuItem = useCallback((item: {
    menuItem: MenuItem
    quantity: number
    addOns: CartItemAddOn[]
    specialInstructions?: string
  }) => {
    setItems(prev => {
      const addOnTotal = item.addOns.reduce((sum, a) => sum + a.price, 0)
      const unitPrice = item.menuItem.price + addOnTotal
      
      // Check if item with same menu item and add-ons exists
      const existingIndex = prev.findIndex(
        existing =>
          existing.type === 'menu_item' &&
          existing.menuItem?.id === item.menuItem.id &&
          JSON.stringify(existing.addOns) === JSON.stringify(item.addOns)
      )
      
      if (existingIndex >= 0) {
        const updated = [...prev]
        const newQty = updated[existingIndex].quantity + item.quantity
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          totalPrice: unitPrice * newQty,
        }
        return updated
      }
      
      return [...prev, {
        id: generateId(),
        type: 'menu_item' as const,
        menuItem: item.menuItem,
        quantity: item.quantity,
        addOns: item.addOns,
        specialInstructions: item.specialInstructions,
        unitPrice,
        totalPrice: unitPrice * item.quantity,
      }]
    })
    setIsCartOpen(true)
  }, [])

  const addDeal = useCallback((item: {
    deal: Deal
    quantity: number
    dealSelections: { drinkIndex: number; drinkId: string; drinkName: string }[]
    specialInstructions?: string
  }) => {
    setItems(prev => {
      const unitPrice = item.deal.price
      
      return [...prev, {
        id: generateId(),
        type: 'deal' as const,
        deal: item.deal,
        dealSelections: item.dealSelections,
        quantity: item.quantity,
        addOns: [], // Deals don't have separate add-ons
        specialInstructions: item.specialInstructions,
        unitPrice,
        totalPrice: unitPrice * item.quantity,
      }]
    })
    setIsCartOpen(true)
  }, [])

  // Legacy addItem for backward compatibility with existing code
  const addItem = useCallback((item: {
    menuItem: MenuItem
    quantity: number
    addOns: CartItemAddOn[]
    specialInstructions?: string
  }) => {
    // Check if this is actually a deal being added (deals have category 'deals')
    if (item.menuItem.category === 'deals') {
      // Convert to deal format - extract drink selections from addOns
      const drinkSelections = item.addOns
        .filter(a => a.id.startsWith('deal-drink-'))
        .map((a, idx) => {
          const drinkId = a.id.split('-').pop() || ''
          return {
            drinkIndex: idx,
            drinkId,
            drinkName: a.name.replace(/^Drink( #\d+)?: /, ''),
          }
        })
      
      setItems(prev => {
        const unitPrice = item.menuItem.price
        
        return [...prev, {
          id: generateId(),
          type: 'deal' as const,
          deal: {
            id: item.menuItem.id,
            name: item.menuItem.name.split(' - ')[0] || item.menuItem.name,
            title: item.menuItem.name.split(' - ')[1] || item.menuItem.name,
            items: item.menuItem.description.split(', '),
            price: item.menuItem.price,
            image: item.menuItem.image,
          },
          dealSelections: drinkSelections,
          quantity: item.quantity,
          addOns: [],
          specialInstructions: item.specialInstructions,
          unitPrice,
          totalPrice: unitPrice * item.quantity,
        }]
      })
      setIsCartOpen(true)
    } else {
      addMenuItem(item)
    }
  }, [addMenuItem])

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }, [])

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(item => item.id !== id))
      return
    }
    setItems(prev => {
      return prev.map(item => {
        if (item.id === id) {
          return {
            ...item,
            quantity,
            totalPrice: item.unitPrice * quantity,
          }
        }
        return item
      })
    })
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
    if (typeof window !== 'undefined') {
      try { sessionStorage.removeItem(CART_STORAGE_KEY) } catch { /* ignore */ }
    }
  }, [])

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0)

  return (
    <CartContext.Provider
      value={{
        items,
        addMenuItem,
        addDeal,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        subtotal,
        isCartOpen,
        setIsCartOpen,
        isCartHydrated,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
