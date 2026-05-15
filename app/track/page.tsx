"use client"

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { 
  Search, 
  Clock, 
  MapPin, 
  Store, 
  CheckCircle2, 
  ChefHat, 
  Package,
  Truck,
  Home,
  Phone,
  ArrowLeft,
  Loader2,
  RefreshCw,
  XCircle,
} from 'lucide-react'
import { toast } from '@/lib/notify'
import { useAdminSettings } from '@/lib/admin-settings'

interface OrderItem {
  id: string
  item_name: string
  quantity: number
  unit_price: number
  total_price: number
  customizations: Record<string, unknown> | null
}

interface OrderStatusHistory {
  id: string
  status: string
  notes: string | null
  created_at: string
}

interface Order {
  id: string
  order_number: string
  customer_name: string
  customer_phone: string
  customer_email: string | null
  order_type: 'delivery' | 'pickup'
  status: string
  delivery_address: string | null
  delivery_fee: number
  subtotal: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  special_instructions: string | null
  estimated_ready_time: string | null
  created_at: string
  items: OrderItem[]
  status_history: OrderStatusHistory[]
  branch?: {
    name: string
    address: string
  }
}

function normalizePhone(value: string): string {
  return (value || '').replace(/\D/g, '')
}

function normalizeStatus(value: string | null | undefined, orderType: 'delivery' | 'pickup'): string {
  const normalized = (value || 'pending').toLowerCase().trim().replace(/\s+/g, '_')

  if (normalized === 'pending') return 'pending'
  if (normalized === 'confirmed') return 'preparing'
  if (normalized === 'preparing' || normalized === 'prepared') return 'preparing'
  if (normalized === 'ready') return 'ready'
  if (normalized === 'out_for_delivery') return 'out_for_delivery'
  if (normalized === 'picked_up') return 'picked_up'
  if (normalized === 'delivered') return orderType === 'pickup' ? 'picked_up' : 'delivered'
  if (normalized === 'cancelled' || normalized === 'canceled') return 'cancelled'

  return 'pending'
}

function normalizeOrder(raw: Record<string, unknown>): Order {
  const rawOrderType = (raw.order_type || raw.orderType || 'delivery') as 'delivery' | 'pickup'
  const orderType: 'delivery' | 'pickup' = rawOrderType === 'pickup' ? 'pickup' : 'delivery'

  const rawItems = Array.isArray(raw.items)
    ? raw.items
    : Array.isArray(raw.order_items)
      ? raw.order_items
      : []

  const items: OrderItem[] = rawItems.map((item, index) => {
    const row = item as Record<string, unknown>

    if (row.item_name) {
      return {
        id: String(row.id || index),
        item_name: String(row.item_name),
        quantity: Number(row.quantity) || 1,
        unit_price: Number(row.unit_price) || 0,
        total_price: Number(row.total_price) || Number(row.unit_price) || 0,
        customizations: (row.customizations as Record<string, unknown>) || null,
      }
    }

    const unitPrice = Number(row.unitPrice ?? row.unit_price ?? row.price) || 0
    const quantity = Number(row.quantity) || 1

    return {
      id: String(row.id || index),
      item_name: String(row.name || row.title || 'Item'),
      quantity,
      unit_price: unitPrice,
      total_price: Number(row.totalPrice ?? row.total_price) || unitPrice * quantity,
      customizations: ((row.addOns || row.specialInstructions) as Record<string, unknown>) || null,
    }
  })

  const statusHistory = Array.isArray(raw.status_history)
    ? (raw.status_history as Array<Record<string, unknown>>).map((history, index) => ({
        id: String(history.id || index),
        status: String(history.status || ''),
        notes: (history.notes as string) || null,
        created_at: String(history.created_at || new Date().toISOString()),
      }))
    : []

  const branchName = String(
    (raw.pickupBranch as string) ||
    (raw.pickup_branch as string) ||
    ((raw.branch as Record<string, unknown>)?.name as string) ||
    ''
  )

  return {
    id: String(raw.id || ''),
    order_number: String(raw.order_number || ''),
    customer_name: String(raw.customer_name || raw.customerName || 'Unknown'),
    customer_phone: String(raw.customer_phone || raw.customerPhone || ''),
    customer_email: (raw.customer_email as string) || (raw.customerEmail as string) || null,
    order_type: orderType,
    status: normalizeStatus(raw.status as string, orderType),
    delivery_address: (raw.delivery_address as string) || (raw.deliveryAddress as string) || null,
    delivery_fee: Number(raw.delivery_fee ?? raw.deliveryFee) || 0,
    subtotal: Number(raw.subtotal) || 0,
    tax_amount: Number(raw.tax_amount ?? raw.taxAmount) || 0,
    discount_amount: Number(raw.discount_amount ?? raw.discountAmount) || 0,
    total_amount: Number(raw.total_amount ?? raw.total) || 0,
    special_instructions: (raw.special_instructions as string) || (raw.specialInstructions as string) || null,
    estimated_ready_time: (raw.estimated_ready_time as string) || (raw.estimated_time as string) || null,
    created_at: String(raw.created_at || raw.createdAt || new Date().toISOString()),
    items,
    status_history: statusHistory,
    branch: branchName
      ? {
          name: branchName,
          address: String(((raw.branch as Record<string, unknown>)?.address as string) || ''),
        }
      : undefined,
  }
}

const statusSteps = [
  { key: 'pending', label: 'Order Placed', icon: CheckCircle2 },
  { key: 'preparing', label: 'Preparing', icon: ChefHat },
]

const deliverySteps = [
  ...statusSteps,
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: Home },
]

const pickupSteps = [
  ...statusSteps,
  { key: 'ready', label: 'Ready', icon: Package },
  { key: 'picked_up', label: 'Picked Up', icon: Store },
]

function getStatusIndex(status: string, isDelivery: boolean): number {
  const steps = isDelivery ? deliverySteps : pickupSteps
  const stepIndex = steps.findIndex(s => s.key === status)
  if (stepIndex >= 0) {
    return stepIndex
  }
  if (!isDelivery && status === 'delivered') {
    return steps.findIndex(s => s.key === 'picked_up')
  }
  return -1
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function OrderTrackingContent() {
  const settings = useAdminSettings()
  const searchParams = useSearchParams()
  const [orderNumber, setOrderNumber] = useState(searchParams.get('order') || '')
  const [phone, setPhone] = useState(searchParams.get('phone') || '')
  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  // Auto-search if query params are provided
  useEffect(() => {
    const orderParam = searchParams.get('order')
    const phoneParam = searchParams.get('phone')
    if (orderParam && phoneParam) {
      setOrderNumber(orderParam)
      setPhone(phoneParam)
      handleSearch(orderParam, phoneParam)
    }
  }, [searchParams])

  const handleSearch = async (searchOrderNumber?: string, searchPhone?: string) => {
    const orderNum = (searchOrderNumber || orderNumber).trim().toUpperCase()
    const phoneNum = (searchPhone || phone).trim()

    if (!orderNum) {
      toast.error('Please enter your order number')
      return
    }
    if (!phoneNum) {
      toast.error('Please enter your phone number')
      return
    }

    setIsLoading(true)
    setHasSearched(true)

    try {
      // First try API
      const response = await fetch(
        `/api/orders/track?orderNumber=${encodeURIComponent(orderNum)}&phone=${encodeURIComponent(phoneNum)}`
      )
      const result = await response.json()

      if (response.ok && !result.error && result.data) {
        setOrder(normalizeOrder(result.data as Record<string, unknown>))
        return
      }
    } catch {
      // API failed, continue to localStorage
    }

    // Fallback: Search localStorage
    try {
      const localOrders = JSON.parse(localStorage.getItem('orders') || '[]')
      const cleanPhoneInput = normalizePhone(phoneNum)
      
      const foundOrder = localOrders.find((o: Record<string, unknown>) => {
        const orderNumberValue = ((o.order_number as string) || '').toUpperCase()
        const customerPhone = normalizePhone((o.customerPhone || o.customer_phone) as string || '')
        
        const orderMatches = orderNumberValue === orderNum || orderNumberValue.includes(orderNum) || orderNum.includes(orderNumberValue)
        const phoneMatches = customerPhone.includes(cleanPhoneInput) || cleanPhoneInput.includes(customerPhone)
        
        return orderMatches && phoneMatches
      })

      if (foundOrder) {
        setOrder(normalizeOrder(foundOrder as Record<string, unknown>))
      } else {
        setOrder(null)
        toast.error('Order not found. Please check your order number and phone number.')
      }
    } catch {
      setOrder(null)
      toast.error('Failed to find order')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = () => {
    if (order) {
      handleSearch()
    }
  }

  const handleCancelOrder = async () => {
    if (!order || order.status !== 'pending') {
      toast.error('Only pending orders can be cancelled')
      return
    }

    setIsCancelling(true)
    try {
      const response = await fetch('/api/orders/track', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber: order.order_number,
          phone,
          reason: 'Cancelled from tracking page',
        }),
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to cancel order')
      }

      setOrder((current) =>
        current
          ? {
              ...current,
              status: 'cancelled',
              status_history: [
                ...current.status_history,
                {
                  id: `cancel-${Date.now()}`,
                  status: 'cancelled',
                  notes: 'Cancelled from tracking page',
                  created_at: new Date().toISOString(),
                },
              ],
            }
          : current,
      )
      toast.success('Order cancelled successfully')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to cancel order'
      toast.error(message)
    } finally {
      setIsCancelling(false)
    }
  }

  const steps = order?.order_type === 'delivery' ? deliverySteps : pickupSteps
  const currentStepIndex = order ? getStatusIndex(order.status, order.order_type === 'delivery') : -1
  const isCancelled = order?.status === 'cancelled'

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Link 
            href="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Back to Menu</span>
          </Link>
          <h1 className="text-lg font-bold text-foreground">Track Order</h1>
          <div className="w-24" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        {/* Search Form */}
        <div className="mb-8 rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-bold text-foreground">Find Your Order</h2>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Order Number
              </label>
              <input
                type="text"
                placeholder="e.g. FP-ABC123"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="Your phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => handleSearch()}
                disabled={isLoading}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-red px-6 text-sm font-semibold text-primary-foreground transition-all hover:bg-brand-red/90 disabled:opacity-50 sm:w-auto"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Track
              </button>
            </div>
          </div>
        </div>

        {/* Order Details */}
        {order && (
          <div className="space-y-6">
            {/* Order Header */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Order Number</p>
                  <h2 className="text-2xl font-bold text-brand-red">{order.order_number}</h2>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Placed on</p>
                  <p className="text-sm font-medium text-foreground">{formatDate(order.created_at)}</p>
                </div>
              </div>
              
              <div className="mt-4 flex items-center gap-2">
                {order.order_type === 'delivery' ? (
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Store className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm text-muted-foreground">
                  {order.order_type === 'delivery' ? 'Delivery to' : 'Pickup from'}:
                </span>
                <span className="text-sm font-medium text-foreground">
                  {order.order_type === 'delivery' 
                    ? order.delivery_address 
                    : order.branch?.name || 'Branch'}
                </span>
              </div>

              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="mt-4 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh Status
              </button>

              {order.status === 'pending' && (
                <button
                  onClick={handleCancelOrder}
                  disabled={isCancelling}
                  className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                >
                  {isCancelling ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5" />
                  )}
                  Cancel Order
                </button>
              )}
            </div>

            {/* Status Progress */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="mb-6 text-sm font-bold uppercase tracking-wider text-foreground">
                Order Status
              </h3>
              
              {isCancelled ? (
                <div className="flex items-center gap-3 rounded-xl bg-destructive/10 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/20">
                    <span className="text-lg">X</span>
                  </div>
                  <div>
                    <p className="font-semibold text-destructive">Order Cancelled</p>
                    <p className="text-sm text-muted-foreground">This order has been cancelled.</p>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  {/* Progress Line */}
                  <div className="absolute left-5 top-5 h-[calc(100%-2.5rem)] w-0.5 bg-border" />
                  <div 
                    className="absolute left-5 top-5 w-0.5 bg-brand-red transition-all duration-500"
                    style={{ 
                      height: `calc(${Math.max(0, currentStepIndex) / (steps.length - 1) * 100}% - ${currentStepIndex === steps.length - 1 ? '0' : '2.5'}rem)` 
                    }}
                  />

                  {/* Steps */}
                  <div className="space-y-6">
                    {steps.map((step, index) => {
                      const isCompleted = index <= currentStepIndex
                      const isCurrent = index === currentStepIndex
                      const Icon = step.icon

                      return (
                        <div key={step.key} className="flex items-start gap-4">
                          <div 
                            className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                              isCompleted 
                                ? 'border-brand-red bg-brand-red text-primary-foreground' 
                                : 'border-border bg-background text-muted-foreground'
                            } ${isCurrent ? 'ring-4 ring-brand-red/20' : ''}`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 pt-2">
                            <p className={`font-semibold ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {step.label}
                            </p>
                            {isCurrent && (
                              <p className="mt-1 text-xs text-brand-red">Current Status</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Order Items */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-foreground">
                Order Items
              </h3>
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="font-medium text-foreground">{item.quantity}x {item.item_name}</p>
                      {item.customizations && Object.keys(item.customizations).length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Customized
                        </p>
                      )}
                    </div>
                    <p className="font-semibold text-foreground">Rs. {item.total_price.toLocaleString()}</p>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 space-y-2 border-t border-border pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground">Rs. {order.subtotal.toLocaleString()}</span>
                </div>
                {order.delivery_fee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Delivery Fee</span>
                    <span className="text-foreground">Rs. {order.delivery_fee.toLocaleString()}</span>
                  </div>
                )}
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="text-green-600">-Rs. {order.discount_amount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-2">
                  <span className="font-bold text-foreground">Total</span>
                  <span className="text-lg font-bold text-brand-red">Rs. {order.total_amount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-foreground">
                Need Help?
              </h3>
              <a 
                href={`tel:${settings.storePhone}`}
                className="flex items-center gap-3 rounded-xl border border-border p-4 transition-all hover:border-brand-red hover:bg-brand-red/5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-red/10">
                  <Phone className="h-5 w-5 text-brand-red" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Call Support</p>
                  <p className="text-sm text-muted-foreground">{settings.storePhone}</p>
                </div>
              </a>
            </div>
          </div>
        )}

        {/* No Results */}
        {hasSearched && !order && !isLoading && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-foreground">Order Not Found</h3>
            <p className="text-sm text-muted-foreground">
              We could not find an order matching the provided details. Please check your order number and phone number.
            </p>
          </div>
        )}

        {/* Initial State */}
        {!hasSearched && !order && (
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center">
            <Clock className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="mb-2 text-lg font-semibold text-foreground">Track Your Order</h3>
            <p className="text-sm text-muted-foreground">
              Enter your order number and phone number above to see the status of your order.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

export default function OrderTrackingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-red" />
      </div>
    }>
      <OrderTrackingContent />
    </Suspense>
  )
}
