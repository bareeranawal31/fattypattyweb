"use client"

import { useState, useEffect } from 'react'
import { X, CheckCircle2, MapPin, Clock, Store, Loader2 } from 'lucide-react'
import { useCart, type CartItem } from '@/lib/cart-context'
import { useAdminSettings } from '@/lib/admin-settings'
import { useOrder } from '@/lib/order-context'
import { useCustomerAuth } from '@/lib/customer-auth-context'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { toast } from '@/lib/notify'

interface AdminCoupon {
  id: string
  code: string
  type: 'percentage' | 'fixed'
  value: number
  isActive: boolean
}

interface AdminSettings {
  coupons?: AdminCoupon[]
}

interface AccountResponse {
  id: string
  name: string | null
  email: string
  phone: string | null
  loyalty_points: number
}

interface SavedAddress {
  id: string
  label: string
  address_line: string
  area: string | null
  city: string | null
  notes: string | null
  is_default: boolean
}

const SETTINGS_STORAGE_KEY = 'adminSettings'
const CUSTOMER_PROFILE_FALLBACK_PREFIX = 'customer-profile-fallback:'
const CUSTOMER_ADDRESSES_FALLBACK_PREFIX = 'customer-addresses:'
const LOYALTY_MIN_ORDER_AMOUNT = 1500
const LOYALTY_FIXED_POINTS = 15
const LOYALTY_REDEEM_VALUE_PER_POINT = 1

function getFallbackProfileKey(userId: string) {
  return `${CUSTOMER_PROFILE_FALLBACK_PREFIX}${userId}`
}

function getFallbackAddressesKey(userId: string) {
  return `${CUSTOMER_ADDRESSES_FALLBACK_PREFIX}${userId}`
}

interface CheckoutModalProps {
  onClose: () => void
}

export function CheckoutModal({ onClose }: CheckoutModalProps) {
  const supabase = createSupabaseClient()
  
  const { items, subtotal, clearCart } = useCart()
  const { orderType, selectedArea, selectedBranch, deliveryAreas, branches } = useOrder()
  const settings = useAdminSettings()
  const { user, profile, refreshProfile } = useCustomerAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [orderNumber, setOrderNumber] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [appliedCouponCode, setAppliedCouponCode] = useState('')
  const [discountAmount, setDiscountAmount] = useState(0)
  const [loyaltyPointsToRedeem, setLoyaltyPointsToRedeem] = useState(0)
  const [redeemLoyalty, setRedeemLoyalty] = useState(false)
  const [couponRules, setCouponRules] = useState<Record<string, { type: 'percentage' | 'fixed'; value: number }>>({})
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState('')
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    area: selectedArea || '',
    orderType: orderType,
    branch: selectedBranch || '',
    notes: '',
  })
  

  const deliveryFee = formData.orderType === 'delivery' ? settings.deliveryFee : 0
  const taxRate = 0 // No tax for now
  const taxAmount = subtotal * taxRate
  const totalBeforeLoyalty = Math.max(0, subtotal + deliveryFee + taxAmount - discountAmount)
  const availableLoyaltyPoints = profile?.current_points || 0
  const loyaltyProgramEnabled = !settings.isLoyaltyPaused
  const redeemValuePerPoint = LOYALTY_REDEEM_VALUE_PER_POINT
  const maxRedeemablePointsByAmount = Math.floor(totalBeforeLoyalty / redeemValuePerPoint)
  const maxRedeemablePoints = loyaltyProgramEnabled ? Math.min(availableLoyaltyPoints, maxRedeemablePointsByAmount) : 0
  const redeemableHundreds = Math.floor(maxRedeemablePoints / 100)
  const redeemableOptions = Array.from({ length: redeemableHundreds }, (_, index) => (index + 1) * 100)
  // Compute loyalty discount: if redeeming >=100 points, treat each 100 points as 10% off
  const loyaltyDiscount = (() => {
    if (!loyaltyProgramEnabled) {
      return 0
    }

    if (loyaltyPointsToRedeem >= 100) {
      const hundreds = Math.floor(loyaltyPointsToRedeem / 100)
      const percent = 10 * hundreds
      return Math.min(Math.round((totalBeforeLoyalty * percent) / 100), totalBeforeLoyalty)
    }
    return Math.min(loyaltyPointsToRedeem * redeemValuePerPoint, totalBeforeLoyalty)
  })()

  const total = Math.max(0, totalBeforeLoyalty - loyaltyDiscount)
  const earnedLoyaltyPoints =
    user && totalBeforeLoyalty >= LOYALTY_MIN_ORDER_AMOUNT
      ? LOYALTY_FIXED_POINTS
      : 0
  const willEarnLoyaltyPoints = earnedLoyaltyPoints > 0
  const estimatedTime =
    formData.orderType === 'delivery'
      ? `${settings.estimatedDeliveryTime} minutes`
      : `${settings.estimatedPickupTime} minutes`

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    const loadCoupons = () => {
      try {
        const stored = localStorage.getItem(SETTINGS_STORAGE_KEY)
        if (!stored) {
          setCouponRules({})
          return
        }

        const settings = JSON.parse(stored) as AdminSettings
        const nextRules: Record<string, { type: 'percentage' | 'fixed'; value: number }> = {}

        ;(settings.coupons || []).forEach((coupon) => {
          if (!coupon?.isActive) {
            return
          }
          const code = (coupon.code || '').trim().toUpperCase()
          if (!code) {
            return
          }
          nextRules[code] = { type: coupon.type, value: coupon.value }
        })

        setCouponRules(nextRules)
      } catch {
        setCouponRules({})
      }
    }

    loadCoupons()
    const onStorage = (event: StorageEvent) => {
      if (event.key === SETTINGS_STORAGE_KEY) {
        loadCoupons()
      }
    }

    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    if (!appliedCouponCode) {
      return
    }

    const rule = couponRules[appliedCouponCode]
    if (!rule) {
      setAppliedCouponCode('')
      setDiscountAmount(0)
      return
    }

    const computedDiscount =
      rule.type === 'percentage'
        ? Math.round((subtotal * rule.value) / 100)
        : rule.value

    const safeDiscount = Math.min(computedDiscount, subtotal + deliveryFee + taxAmount)
    setDiscountAmount(safeDiscount)
  }, [appliedCouponCode, couponRules, subtotal, deliveryFee, taxAmount])

  useEffect(() => {
    setLoyaltyPointsToRedeem((prev) => Math.min(prev, maxRedeemablePoints))
  }, [maxRedeemablePoints])

  useEffect(() => {
    if (!redeemLoyalty) {
      setLoyaltyPointsToRedeem(0)
      return
    }

    if (redeemableOptions.length > 0 && loyaltyPointsToRedeem < 100) {
      setLoyaltyPointsToRedeem(redeemableOptions[0])
    }
  }, [redeemLoyalty, redeemableOptions, loyaltyPointsToRedeem])

  useEffect(() => {
    if (!user) {
      setSavedAddresses([])
      setSelectedSavedAddressId('')
      return
    }

    let isCancelled = false

    const loadSavedCustomerData = async () => {
      let nextAccount: Partial<AccountResponse> = {
        email: user.email || '',
        name: profile?.full_name || '',
      }
      let nextAddresses: SavedAddress[] = []

      try {
        const [accountResponse, addressesResponse] = await Promise.all([
          fetch('/api/customer/account', { cache: 'no-store' }),
          fetch('/api/customer/addresses', { cache: 'no-store' }),
        ])

        const [accountResult, addressesResult] = await Promise.all([
          accountResponse.json(),
          addressesResponse.json(),
        ])

        if (accountResponse.ok && accountResult.data) {
          nextAccount = accountResult.data as AccountResponse
        }

        if (addressesResponse.ok && Array.isArray(addressesResult.data)) {
          nextAddresses = addressesResult.data as SavedAddress[]
          localStorage.setItem(getFallbackAddressesKey(user.id), JSON.stringify(nextAddresses))
        }
      } catch {
        // continue with local fallbacks below
      }

      try {
        const fallbackProfileRaw = localStorage.getItem(getFallbackProfileKey(user.id))
        if (fallbackProfileRaw) {
          const fallbackProfile = JSON.parse(fallbackProfileRaw) as {
            email?: string
            full_name?: string | null
            phone?: string | null
          }
          nextAccount = {
            email: nextAccount.email || fallbackProfile.email || user.email || '',
            name: nextAccount.name || fallbackProfile.full_name || profile?.full_name || '',
            phone: nextAccount.phone || fallbackProfile.phone || null,
          }
        }
      } catch {
        // ignore bad fallback profile json
      }

      if (nextAddresses.length === 0) {
        try {
          const fallbackAddressesRaw = localStorage.getItem(getFallbackAddressesKey(user.id))
          if (fallbackAddressesRaw) {
            nextAddresses = JSON.parse(fallbackAddressesRaw) as SavedAddress[]
          }
        } catch {
          // ignore bad fallback addresses json
        }
      }

      if (isCancelled) {
        return
      }

      const defaultAddress = nextAddresses.find((address) => address.is_default) || nextAddresses[0]

      setSavedAddresses(nextAddresses)
      setSelectedSavedAddressId(defaultAddress?.id || '')
      setFormData((prev) => ({
        ...prev,
        email: prev.email || nextAccount.email || user.email || '',
        fullName: prev.fullName || nextAccount.name || profile?.full_name || '',
        phone: prev.phone || nextAccount.phone || '',
        area: prev.area || defaultAddress?.area || selectedArea || '',
        address:
          prev.address ||
          (defaultAddress
            ? `${defaultAddress.address_line}${defaultAddress.city ? `, ${defaultAddress.city}` : ''}`
            : ''),
      }))
    }

    loadSavedCustomerData()

    return () => {
      isCancelled = true
    }
  }, [profile?.full_name, selectedArea, user])

  useEffect(() => {
    if (!selectedSavedAddressId) {
      return
    }

    const selectedAddress = savedAddresses.find((address) => address.id === selectedSavedAddressId)
    if (!selectedAddress) {
      return
    }

    setFormData((prev) => ({
      ...prev,
      area: selectedAddress.area || prev.area,
      address: `${selectedAddress.address_line}${selectedAddress.city ? `, ${selectedAddress.city}` : ''}`,
    }))
  }, [savedAddresses, selectedSavedAddressId])

  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.fullName.trim()) {
      toast.error('Please enter your name')
      return
    }
    if (!formData.phone.trim()) {
      toast.error('Please enter your phone number')
      return
    }
    if (formData.orderType === 'delivery' && !formData.area) {
      toast.error('Please select a delivery area')
      return
    }
    if (formData.orderType === 'delivery' && !formData.address.trim()) {
      toast.error('Please enter your delivery address')
      return
    }
    if (branches.length === 0) {
      toast.error('No branches are configured for orders at the moment')
      return
    }
    if (formData.orderType === 'pickup' && !formData.branch) {
      toast.error('Please select a pickup branch')
      return
    }
    if (!settings.isAcceptingOrders) {
      toast.error('Ordering is currently disabled')
      return
    }
    if (formData.orderType === 'delivery' && !settings.isDeliveryEnabled) {
      toast.error('Delivery is currently unavailable')
      return
    }
    if (formData.orderType === 'pickup' && !settings.isPickupEnabled) {
      toast.error('Pickup is currently unavailable')
      return
    }
    if (subtotal < settings.minOrderAmount) {
      toast.error(`Minimum order amount is Rs. ${settings.minOrderAmount.toLocaleString()}`)
      return
    }

    setIsSubmitting(true)

    try {
      // Prepare cart items for order
      const orderItems = items.map((item: CartItem) => ({
        id: item.id,
        name: item.type === 'deal' 
          ? `${item.deal?.name} - ${item.deal?.title}` 
          : item.menuItem?.name || 'Unknown Item',
        variation: item.type === 'deal' 
          ? item.deal?.title 
          : (item.menuItem?.variations && item.menuItem.variations.length > 0 
              ? item.menuItem.variations[0].name 
              : 'Standard'),
        quantity: item.quantity,
        price: item.totalPrice,
        addOns: item.addOns,
        specialInstructions: item.specialInstructions,
      }))

      // Generate order number
      const generatedOrderNumber = `FP-${Date.now()}`

      // Create order object
      const newOrder = {
        id: Date.now(),
        order_number: generatedOrderNumber,
        user_id: user?.id || null,
        customerName: formData.fullName.trim(),
        customerPhone: formData.phone.trim(),
        customerEmail: user?.email || formData.email.trim() || 'guest@fattypatty.pk',
        orderType: formData.orderType,
        pickupBranch: formData.orderType === 'pickup' ? (branches.find(b => b.id === formData.branch)?.name || formData.branch) : undefined,
        deliveryArea: formData.orderType === 'delivery' ? formData.area : undefined,
        deliveryAddress: formData.orderType === 'delivery' ? formData.address.trim() : undefined,
        selectedBranchId: formData.branch,
        deliveryLatitude: undefined,
        deliveryLongitude: undefined,
        deliveryFee,
        couponCode: appliedCouponCode || undefined,
        discountAmount,
        subtotal,
        total,
        loyaltyEligibleTotal: totalBeforeLoyalty,
        loyaltyPointsRedeemed: loyaltyProgramEnabled ? loyaltyPointsToRedeem : 0,
        loyaltyEnabled: loyaltyProgramEnabled,
        specialInstructions: formData.notes.trim() || undefined,
        items: orderItems,
        status: 'Pending',
        createdAt: new Date().toISOString(),
      }

      // Try API first, fallback to localStorage
      let orderNumber = generatedOrderNumber
      try {
        const headers: HeadersInit = { 'Content-Type': 'application/json' }

        if (user) {
          const {
            data: { session },
          } = await supabase.auth.getSession()

          if (session?.access_token) {
            headers.Authorization = `Bearer ${session.access_token}`
          }
        }

        console.info('Submitting order payload', {
          userId: user?.id || null,
          customerEmail: newOrder.customerEmail,
          orderNumber: newOrder.order_number,
          itemCount: newOrder.items.length,
          subtotal: newOrder.subtotal,
          total: newOrder.total,
        })

        const response = await fetch('/api/orders', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify(newOrder),
        })

        const result = await response.json()

        console.info('Order API response', {
          ok: response.ok,
          status: response.status,
          error: result?.error || null,
          orderId: result?.data?.id || null,
          orderNumber: result?.data?.order_number || null,
        })

        if (response.ok && !result.error && result.data?.order_number) {
          orderNumber = result.data.order_number
        } else {
          // API failed, save to localStorage
          const orders = JSON.parse(localStorage.getItem('orders') || '[]')
          orders.push(newOrder)
          localStorage.setItem('orders', JSON.stringify(orders))
        }
      } catch {
        // API error, save to localStorage
        const orders = JSON.parse(localStorage.getItem('orders') || '[]')
        orders.push(newOrder)
        localStorage.setItem('orders', JSON.stringify(orders))
      }

      // Try to send confirmation email (non-blocking)
      try {
        await fetch('/api/send-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: formData.fullName,
            email: formData.email,
            orderId: orderNumber,
            items: orderItems.map(item => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price,
            })),
            total,
            orderType: formData.orderType,
            estimatedTime,
            area: formData.area,
            branch: formData.branch ? branches.find(b => b.id === formData.branch)?.name : '',
            storeName: settings.storeName,
            storePhone: settings.storePhone,
            storeEmail: settings.storeEmail,
          }),
        })
      } catch {
        // Email sending is non-critical
      }

      setOrderNumber(orderNumber)
      setOrderPlaced(true)
      clearCart()
      setLoyaltyPointsToRedeem(0)
      if (user) {
        try {
          const existingRaw = localStorage.getItem(getFallbackProfileKey(user.id))
          const existing = existingRaw
            ? (JSON.parse(existingRaw) as {
                current_points?: number
                lifetime_points_earned?: number
                total_points_redeemed?: number
                full_name?: string | null
                email?: string
              })
            : {}

          const earned =
            loyaltyProgramEnabled && totalBeforeLoyalty >= LOYALTY_MIN_ORDER_AMOUNT
              ? LOYALTY_FIXED_POINTS
              : 0
          const redeemed = loyaltyPointsToRedeem
          const nextCurrentPoints = Math.max(0, (existing.current_points || 0) + earned - redeemed)

          localStorage.setItem(
            getFallbackProfileKey(user.id),
            JSON.stringify({
              id: user.id,
              email: user.email || existing.email || formData.email || '',
              full_name: existing.full_name || profile?.full_name || formData.fullName || null,
              current_points: nextCurrentPoints,
              lifetime_points_earned: (existing.lifetime_points_earned || 0) + earned,
              total_points_redeemed: (existing.total_points_redeemed || 0) + redeemed,
            }),
          )
        } catch {
          // ignore local fallback errors
        }

        await refreshProfile()
      }
      toast.success('Order placed successfully!')
    } catch (error) {
      console.error('Order submission error:', error)
      toast.error(error instanceof Error ? error.message : 'Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateField = (field: string, value: string) => {
    if (field === 'area' || field === 'address') {
      setSelectedSavedAddressId('')
    }
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Delivery location selection removed from UI.

  const applyCoupon = () => {
    const normalizedCode = couponCode.trim().toUpperCase()
    if (!normalizedCode) {
      toast.error('Please enter a coupon code')
      return
    }

    const rule = couponRules[normalizedCode]
    if (!rule) {
      toast.error('Invalid coupon code. Please use a valid active coupon.')
      return
    }

    const computedDiscount =
      rule.type === 'percentage'
        ? Math.round((subtotal * rule.value) / 100)
        : rule.value

    const safeDiscount = Math.min(computedDiscount, subtotal + deliveryFee + taxAmount)

    setAppliedCouponCode(normalizedCode)
    setDiscountAmount(safeDiscount)
    toast.success(`Coupon ${normalizedCode} applied`) 
  }

  const removeCoupon = () => {
    setAppliedCouponCode('')
    setCouponCode('')
    setDiscountAmount(0)
  }

  const applyLoyaltyPoints = () => {
    if (!user) {
      toast.error('Please sign in to redeem loyalty points')
      return
    }

    if (!redeemLoyalty) {
      toast.error('Enable loyalty redemption to use points')
      return
    }

    const safePoints = Math.min(loyaltyPointsToRedeem, maxRedeemablePoints)
    if (safePoints < 100) {
      toast.error('Redeem points in steps of 100')
      return
    }

    const normalizedPoints = Math.floor(safePoints / 100) * 100
    if (normalizedPoints <= 0) {
      toast.error('No redeemable points available for this order')
      return
    }

    setLoyaltyPointsToRedeem(normalizedPoints)
    const percent = 10 * (normalizedPoints / 100)
    const redeemAmount = Math.round((subtotal * percent) / 100)
    toast.success(`${normalizedPoints} points applied (${percent}% off, Rs. ${redeemAmount.toLocaleString()})`)
  }

  const clearLoyaltyPoints = () => {
    setLoyaltyPointsToRedeem(0)
    setRedeemLoyalty(false)
  }

  if (orderPlaced) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-brand-dark/50 backdrop-blur-sm p-4">
        <div className="w-full max-w-md rounded-2xl bg-card p-8 text-center shadow-2xl animate-fade-in-up">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-foreground">Order Placed!</h2>
          <p className="mb-1 text-sm text-muted-foreground">
            Your order has been placed successfully.
          </p>
          <p className="mb-2 text-sm font-medium text-foreground">
            Order Number: <span className="text-brand-red font-bold">{orderNumber}</span>
          </p>
          <p className="mb-1 text-xs text-muted-foreground">
            Estimated Time: <span className="font-medium text-foreground">{estimatedTime}</span>
          </p>
          {formData.email && (
            <p className="mb-6 text-xs text-muted-foreground">
              A confirmation email has been sent to your email.
            </p>
          )}
          <div className="space-y-3">
            <a
              href={`/track?order=${orderNumber}&phone=${encodeURIComponent(formData.phone)}`}
              className="block w-full rounded-xl border border-brand-red py-3 text-sm font-semibold text-brand-red transition-all hover:bg-brand-red/5"
            >
              Track Your Order
            </a>
            <button
              onClick={onClose}
              className="w-full rounded-xl bg-brand-red py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-brand-red/90"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-brand-dark/50 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-2xl rounded-2xl bg-card shadow-2xl animate-fade-in-up">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="text-lg font-bold text-foreground">Checkout</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close checkout"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5">
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3 space-y-5">
              {/* Customer Details */}
              <div>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-foreground">Customer Details</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    required
                    placeholder="Full Name *"
                    value={formData.fullName}
                    onChange={(e) => updateField('fullName', e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
                  />
                  <input
                    type="email"
                    placeholder="Email Address (optional)"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
                  />
                  <input
                    type="tel"
                    required
                    placeholder="Phone Number *"
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
                  />
                </div>
              </div>

              {/* Order Type */}
              <div>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-foreground">Order Type</h3>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => updateField('orderType', 'delivery')}
                    disabled={!settings.isAcceptingOrders || !settings.isDeliveryEnabled}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-all ${
                      formData.orderType === 'delivery'
                        ? 'border-brand-red bg-brand-red/10 text-brand-red'
                        : 'border-border bg-background text-foreground hover:bg-muted'
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <MapPin className="h-4 w-4" />
                    Delivery
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField('orderType', 'pickup')}
                    disabled={!settings.isAcceptingOrders || !settings.isPickupEnabled}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-all ${
                      formData.orderType === 'pickup'
                        ? 'border-brand-red bg-brand-red/10 text-brand-red'
                        : 'border-border bg-background text-foreground hover:bg-muted'
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <Store className="h-4 w-4" />
                    Pickup
                  </button>
                </div>
              </div>

              {/* Delivery Details */}
              {formData.orderType === 'delivery' && (
                <div>
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-foreground">Delivery Details</h3>
                  <div className="space-y-3">
                    {user && savedAddresses.length > 0 && (
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Saved Address
                        </label>
                        <select
                          value={selectedSavedAddressId}
                          onChange={(e) => setSelectedSavedAddressId(e.target.value)}
                          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
                        >
                          <option value="">Use a different address</option>
                          {savedAddresses.map((address) => (
                            <option key={address.id} value={address.id}>
                              {address.label} - {address.area || 'No area'} - {address.address_line}
                            </option>
                          ))}
                        </select>
                        {savedAddresses.length > 1 && !selectedSavedAddressId && (
                          <p className="mt-2 text-xs text-muted-foreground">Select one of your saved addresses or enter a new one below.</p>
                        )}
                      </div>
                    )}

                    <select
                      required
                      value={formData.area}
                      onChange={(e) => updateField('area', e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
                    >
                      <option value="">Select Delivery Area *</option>
                      {deliveryAreas.map((area) => (
                        <option key={area} value={area}>{area}</option>
                      ))}
                    </select>

                    <textarea
                      required
                      rows={2}
                      placeholder="Full Delivery Address *"
                      value={formData.address}
                      onChange={(e) => updateField('address', e.target.value)}
                      className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
                    />
                  </div>
                </div>
              )}

              {/* Pickup Branch */}
              {formData.orderType === 'pickup' && (
                <div>
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-foreground">Pickup Branch</h3>
                  <div className="space-y-2">
                    {branches.map((branch) => (
                      <button
                        key={branch.id}
                        type="button"
                        onClick={() => updateField('branch', branch.id)}
                        className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                          formData.branch === branch.id
                            ? 'border-brand-red bg-brand-red/5'
                            : 'border-border bg-background hover:bg-muted'
                        }`}
                      >
                        <Store className={`h-5 w-5 mt-0.5 ${formData.branch === branch.id ? 'text-brand-red' : 'text-muted-foreground'}`} />
                        <div>
                          <p className="text-sm font-semibold text-foreground">{branch.name}</p>
                          <p className="text-xs text-muted-foreground">{branch.address}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-foreground">Special Instructions</h3>
                <textarea
                  rows={2}
                  placeholder="Any special requests or notes..."
                  value={formData.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
                />
              </div>

              {/* Coupon Code */}
              <div>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-foreground">Discount Coupon</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter coupon code (optional)"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm uppercase text-foreground placeholder:text-muted-foreground focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
                  />
                  <button
                    type="button"
                    onClick={applyCoupon}
                    className="rounded-xl border border-brand-red px-4 py-3 text-sm font-semibold text-brand-red transition-all hover:bg-brand-red/5"
                  >
                    Apply
                  </button>
                </div>
                {appliedCouponCode && (
                  <div className="mt-2 flex items-center justify-between rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">
                    <span>
                      Applied: <strong>{appliedCouponCode}</strong>
                    </span>
                    <button type="button" onClick={removeCoupon} className="font-semibold hover:underline">
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {!settings.isLoyaltyPaused && (
                <div>
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-foreground">Loyalty Points</h3>
                  {!user ? (
                    <p className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                      Sign in to redeem points and earn points on qualifying orders.
                    </p>
                  ) : (
                    <>
                      <p className="mb-2 text-xs text-muted-foreground">
                        Available: <span className="font-semibold text-foreground">{availableLoyaltyPoints}</span> points
                      </p>
                      {availableLoyaltyPoints >= 100 && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                          <label className="flex items-start gap-2 text-xs text-amber-900">
                            <input
                              type="checkbox"
                              checked={redeemLoyalty}
                              onChange={(e) => setRedeemLoyalty(e.target.checked)}
                              className="mt-0.5 h-4 w-4 rounded border-amber-400 text-brand-red focus:ring-brand-red"
                            />
                            <span>
                              Your points have reached 100. You are now able to get a 10% discount. If you have 200 points, you can get 20% off, 300 points gives 30% off, and so on. Redeem now.
                            </span>
                          </label>

                          {redeemLoyalty && (
                            <div className="mt-3 flex gap-2">
                              <select
                                value={loyaltyPointsToRedeem || 100}
                                onChange={(e) => setLoyaltyPointsToRedeem(Number(e.target.value))}
                                className="w-full rounded-xl border border-amber-300 bg-background px-4 py-3 text-sm text-foreground focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
                              >
                                {redeemableOptions.map((points) => (
                                  <option key={points} value={points}>
                                    {points} points
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={applyLoyaltyPoints}
                                className="rounded-xl border border-brand-red px-4 py-3 text-sm font-semibold text-brand-red transition-all hover:bg-brand-red/5"
                              >
                                Redeem
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      {availableLoyaltyPoints > 0 && availableLoyaltyPoints < 100 && (
                        <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-3 text-xs text-amber-900">
                          When your points reach 100, you will be able to get a 10% discount. Keep collecting points to unlock 20% at 200, 30% at 300, and so on.
                        </div>
                      )}
                      {loyaltyDiscount > 0 && (
                        <div className="mt-2 flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                          <span>
                            Redeemed: <strong>{loyaltyPointsToRedeem} points (Rs. {loyaltyDiscount.toLocaleString()})</strong>
                          </span>
                          <button type="button" onClick={clearLoyaltyPoints} className="font-semibold hover:underline">
                            Remove
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-2">
              <div className="rounded-xl border border-border bg-background p-4 sticky top-4">
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-foreground">Order Summary</h3>
                <div className="mb-4 max-h-48 space-y-2 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground truncate mr-2">
                        {item.quantity}x {item.type === 'deal' 
                          ? `${item.deal?.name}` 
                          : item.menuItem?.name}
                      </span>
                      <span className="font-medium text-foreground flex-shrink-0">
                        Rs. {item.totalPrice.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 border-t border-border pt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-foreground">Rs. {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Delivery</span>
                    <span className="text-foreground">
                      {formData.orderType === 'pickup' ? 'Free' : `Rs. ${deliveryFee}`}
                    </span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Discount</span>
                      <span className="text-green-600">- Rs. {discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  {loyaltyDiscount > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Loyalty Redeemed</span>
                      <span className="text-amber-700">- Rs. {loyaltyDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-border pt-2">
                    <span className="font-bold text-foreground">Total</span>
                    <span className="text-lg font-bold text-brand-red">Rs. {total.toLocaleString()}</span>
                  </div>
                </div>

                <div className="mt-3 rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                  {user ? (
                    willEarnLoyaltyPoints ? (
                      <span>
                        This order qualifies for <strong className="text-foreground">{earnedLoyaltyPoints} loyalty points</strong>.
                      </span>
                    ) : (
                      <span>
                        Spend Rs. {LOYALTY_MIN_ORDER_AMOUNT.toLocaleString()}+ in this order to earn {LOYALTY_FIXED_POINTS} points.
                      </span>
                    )
                  ) : (
                    <span>
                      Sign in to earn {LOYALTY_FIXED_POINTS} points on orders from Rs. {LOYALTY_MIN_ORDER_AMOUNT.toLocaleString()} and above.
                    </span>
                  )}
                </div>

                {subtotal < settings.minOrderAmount && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                    Add Rs. {(settings.minOrderAmount - subtotal).toLocaleString()} more to reach the minimum order amount.
                  </div>
                )}
                
                {/* Estimated Time */}
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted/50 p-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Estimated: <span className="font-medium text-foreground">{estimatedTime}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || branches.length === 0}
            className="mt-6 w-full flex items-center justify-center gap-2 rounded-xl bg-brand-red py-3.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-brand-red/90 disabled:opacity-50 active:scale-[0.98]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Placing Order...
              </>
            ) : (
              `Place Order - Rs. ${total.toLocaleString()}`
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
