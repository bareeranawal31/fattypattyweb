"use client"

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { 
  Search, 
  Filter, 
  Clock, 
  MapPin, 
  Store,
  Phone,
  X,
  Loader2,
  RefreshCw,
  ChevronRight
} from 'lucide-react'
import { toast } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { setStorageWithSync } from '@/lib/storage-sync'

interface OrderItem {
  id: string
  name: string
  variation?: string
  title?: string | null
  type?: 'menu_item' | 'deal'
  quantity: number
  price?: number
  unitPrice?: number
  totalPrice?: number
  unit_price?: number
  total_price?: number
  item_name?: string
  addOns?: Array<{ id: string; name: string; price: number }>
  specialInstructions?: string | null
}

interface Order {
  id: string | number
  order_number: string
  customer_name?: string
  customerName?: string
  customer_phone?: string
  customerPhone?: string
  customer_email?: string | null
  customerEmail?: string | null
  order_type?: 'delivery' | 'pickup'
  orderType?: 'delivery' | 'pickup'
  status: string
  delivery_area?: string | null
  deliveryArea?: string | null
  delivery_address?: string | null
  deliveryAddress?: string | null
  pickup_branch?: string | null
  pickupBranch?: string | null
  delivery_fee?: number
  deliveryFee?: number
  subtotal: number
  total: number
  total_amount?: number
  special_instructions?: string | null
  specialInstructions?: string | null
  estimated_time?: string | null
  created_at?: string
  createdAt?: string
  items: OrderItem[]
}

const statusOptions = [
  { value: 'all', label: 'All Orders' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'delivered', label: 'Delivered' },
]

const statusDisplayMap: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready for Pickup',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  picked_up: 'Picked Up',
  cancelled: 'Cancelled',
}

function getNextStatuses(orderType: 'delivery' | 'pickup', currentStatus: string): string[] {
  const status = currentStatus.toLowerCase()

  if (orderType === 'pickup') {
    const pickupFlow: Record<string, string[]> = {
      pending: ['preparing'],
      confirmed: ['preparing'],
      preparing: ['ready'],
      ready: ['picked_up'],
    }
    return pickupFlow[status] || []
  }

  const deliveryFlow: Record<string, string[]> = {
    pending: ['preparing'],
    confirmed: ['preparing'],
    preparing: ['out_for_delivery'],
    out_for_delivery: ['delivered'],
  }
  return deliveryFlow[status] || []
}

function getStatusActionLabel(currentStatus: string, nextStatus: string): string {
  const current = currentStatus.toLowerCase()

  if (current === 'pending' && nextStatus === 'preparing') {
    return 'Confirm Order'
  }

  if (nextStatus === 'out_for_delivery') {
    return 'Mark Out for Delivery'
  }

  if (nextStatus === 'ready') {
    return 'Mark Ready for Pickup'
  }

  if (nextStatus === 'picked_up') {
    return 'Mark Picked Up'
  }

  if (nextStatus === 'delivered') {
    return 'Mark Delivered'
  }

  return `Mark as ${statusDisplayMap[nextStatus] || nextStatus}`
}

function OrdersContent() {
  const searchParams = useSearchParams()
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [dateFilter, setDateFilter] = useState(searchParams.get('date') || '')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)

  const fetchOrders = async () => {
    setIsLoading(true)
    try {
      // First try API
      let apiOrders: Order[] = []
      try {
        const url = statusFilter === 'all' 
          ? '/api/admin/orders' 
          : `/api/admin/orders?status=${statusFilter}`
        const response = await fetch(url)
        const data = await response.json()
        if (data.data) apiOrders = data.data
      } catch {
        // API failed, continue with localStorage only
      }

      // Also get orders from localStorage
      const localOrders: Order[] = JSON.parse(localStorage.getItem('orders') || '[]')
      
      // Combine and deduplicate by order_number
      const allOrders = [...apiOrders]
      localOrders.forEach((localOrder: Order) => {
        if (!allOrders.find(o => o.order_number === localOrder.order_number)) {
          allOrders.push(localOrder)
        }
      })

      // Hide cancelled orders from the default admin list
      let filteredOrders = allOrders.filter(o => (o.status || '').toLowerCase() !== 'cancelled')
      if (statusFilter !== 'all') {
        filteredOrders = allOrders.filter(o => 
          o.status.toLowerCase() === statusFilter.toLowerCase()
        )
      }

      // Sort by date (newest first)
      filteredOrders.sort((a, b) => {
        const dateA = new Date(a.created_at || a.createdAt || 0)
        const dateB = new Date(b.created_at || b.createdAt || 0)
        return dateB.getTime() - dateA.getTime()
      })

      setOrders(filteredOrders)
    } catch (error) {
      console.error('Error fetching orders:', error)
      toast.error('Failed to fetch orders')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 30000)
    return () => clearInterval(interval)
  }, [statusFilter])

  const updateOrderStatus = async (orderId: string | number, newStatus: string) => {
    setIsUpdating(true)
    try {
      // Try API first
      let apiSuccess = false
      try {
        const response = await fetch(`/api/admin/orders/${orderId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        })
        
        const data = await response.json()
        if (!data.error) apiSuccess = true
      } catch {
        // API failed
      }

      // Also update localStorage
      const localOrders: Order[] = JSON.parse(localStorage.getItem('orders') || '[]')
      const updatedLocalOrders = localOrders.map(o => 
        (o.id === orderId || o.order_number === selectedOrder?.order_number) 
          ? { ...o, status: newStatus } 
          : o
      )
      setStorageWithSync('orders', JSON.stringify(updatedLocalOrders))

      setOrders(prev => prev.map(o => 
        o.id === orderId ? { ...o, status: newStatus } : o
      ))
      
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null)
      }

      toast.success(`Order status updated to ${statusDisplayMap[newStatus] || newStatus}`)
    } catch (error) {
      toast.error('Failed to update order status')
    } finally {
      setIsUpdating(false)
    }
  }

  // Helper to get normalized order values
  const getOrderValue = (order: Order, field: string) => {
    const fieldMap: Record<string, string[]> = {
      customerName: ['customer_name', 'customerName'],
      customerPhone: ['customer_phone', 'customerPhone'],
      customerEmail: ['customer_email', 'customerEmail'],
      orderType: ['order_type', 'orderType'],
      deliveryArea: ['delivery_area', 'deliveryArea'],
      deliveryAddress: ['delivery_address', 'deliveryAddress'],
      pickupBranch: ['pickup_branch', 'pickupBranch'],
      deliveryFee: ['delivery_fee', 'deliveryFee'],
      specialInstructions: ['special_instructions', 'specialInstructions'],
      createdAt: ['created_at', 'createdAt'],
    }
    const keys = fieldMap[field] || [field]
    for (const key of keys) {
      if ((order as Record<string, unknown>)[key] !== undefined) {
        return (order as Record<string, unknown>)[key]
      }
    }
    return null
  }

  const filteredOrders = orders.filter(order => {
    const createdAtRaw = (getOrderValue(order, 'createdAt') as string) || ''

    if (dateFilter) {
      const orderDate = new Date(createdAtRaw).toLocaleDateString('en-CA')
      if (orderDate !== dateFilter) {
        return false
      }
    }

    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    const customerName = (getOrderValue(order, 'customerName') as string || '').toLowerCase()
    const customerPhone = (getOrderValue(order, 'customerPhone') as string || '')
    return (
      order.order_number.toLowerCase().includes(query) ||
      customerName.includes(query) ||
      customerPhone.includes(query)
    )
  })

  const getStatusColor = (status: string) => {
    const normalizedStatus = status.toLowerCase()
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
      preparing: 'bg-orange-100 text-orange-800 border-orange-200',
      ready: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      out_for_delivery: 'bg-purple-100 text-purple-800 border-purple-200',
      delivered: 'bg-green-100 text-green-800 border-green-200',
      picked_up: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
    }
    return colors[normalizedStatus] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Unknown date'
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* Orders List */}
      <div className="flex w-full flex-col lg:w-1/2">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Orders</h1>
          <button
            onClick={fetchOrders}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 text-sm focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none rounded-lg border border-border bg-background py-2 pl-10 pr-8 text-sm focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => setStatusFilter('cancelled')}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              statusFilter === 'cancelled'
                ? 'border-brand-red bg-brand-red text-white'
                : 'border-border bg-background text-muted-foreground hover:bg-muted'
            }`}
          >
            Cancelled
          </button>
          <div className="relative">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="rounded-lg border border-border bg-background py-2 px-3 text-sm focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
            />
          </div>
        </div>

        {/* Orders List */}
        <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-card">
          {isLoading && orders.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-brand-red" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-8">
              <Clock className="mb-4 h-12 w-12 text-muted-foreground/30" />
              <p className="text-muted-foreground">No orders found</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredOrders.map((order) => {
                const customerName = getOrderValue(order, 'customerName') as string || 'Unknown'
                const orderType = getOrderValue(order, 'orderType') as string || 'delivery'
                const createdAt = getOrderValue(order, 'createdAt') as string
                return (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className={cn(
                      "flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/50",
                      selectedOrder?.id === order.id && "bg-muted"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{order.order_number}</span>
                        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${getStatusColor(order.status)}`}>
                          {statusDisplayMap[order.status.toLowerCase()] || order.status}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm text-muted-foreground">{customerName}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        {orderType === 'delivery' ? (
                          <MapPin className="h-3 w-3" />
                        ) : (
                          <Store className="h-3 w-3" />
                        )}
                        <span className="capitalize">{orderType}</span>
                        <span>-</span>
                        <span>{formatDate(createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">Rs. {(order.total || order.total_amount || 0).toLocaleString()}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Order Details Panel */}
      <div className="hidden lg:block lg:w-1/2">
        {selectedOrder ? (
          <div className="h-full overflow-y-auto rounded-xl border border-border bg-card">
            <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card p-4">
              <div>
                <h2 className="text-lg font-bold text-foreground">{selectedOrder.order_number}</h2>
                <p className="text-sm text-muted-foreground">{formatDate(getOrderValue(selectedOrder, 'createdAt') as string)}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-6">
              {/* Status Actions */}
              {getNextStatuses((getOrderValue(selectedOrder, 'orderType') as 'delivery' | 'pickup') || 'delivery', selectedOrder.status).length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-foreground">Update Status</h3>
                  <div className="flex flex-wrap gap-2">
                    {getNextStatuses((getOrderValue(selectedOrder, 'orderType') as 'delivery' | 'pickup') || 'delivery', selectedOrder.status).map((status) => (
                      <button
                        key={status}
                        onClick={() => updateOrderStatus(selectedOrder.id, status)}
                        disabled={isUpdating}
                        className="rounded-lg px-4 py-2 text-sm font-medium transition-colors bg-brand-red text-primary-foreground hover:bg-brand-red/90"
                      >
                        {isUpdating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          getStatusActionLabel(selectedOrder.status, status)
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Customer Info */}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground">Customer</h3>
                <div className="rounded-lg border border-border p-3 space-y-2">
                  <p className="font-medium text-foreground">{getOrderValue(selectedOrder, 'customerName') as string || 'Unknown'}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <a href={`tel:${getOrderValue(selectedOrder, 'customerPhone')}`} className="hover:text-brand-red">
                      {getOrderValue(selectedOrder, 'customerPhone') as string || 'N/A'}
                    </a>
                  </div>
                  {getOrderValue(selectedOrder, 'customerEmail') && (
                    <p className="text-sm text-muted-foreground">{getOrderValue(selectedOrder, 'customerEmail') as string}</p>
                  )}
                </div>
              </div>

              {/* Delivery/Pickup Info */}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground">
                  {getOrderValue(selectedOrder, 'orderType') === 'delivery' ? 'Delivery Address' : 'Pickup'}
                </h3>
                <div className="rounded-lg border border-border p-3">
                  <div className="flex items-start gap-2">
                    {getOrderValue(selectedOrder, 'orderType') === 'delivery' ? (
                      <>
                        <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                        <p className="text-sm text-foreground">{getOrderValue(selectedOrder, 'deliveryAddress') as string || 'N/A'}</p>
                      </>
                    ) : (
                      <>
                        <Store className="mt-0.5 h-4 w-4 text-muted-foreground" />
                        <p className="text-sm text-foreground">{getOrderValue(selectedOrder, 'pickupBranch') as string || 'Customer will pickup from branch'}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground">Items</h3>
                <div className="rounded-lg border border-border divide-y divide-border">
                  {selectedOrder.items.map((item, index) => {
                    const itemName = item.item_name || item.name || 'Unknown Item'
                    const variation = item.variation ? ` (${item.variation})` : ''
                    const unitPrice = item.unit_price || item.unitPrice || item.price || 0
                    const totalPrice = item.total_price || item.totalPrice || item.price || 0
                    return (
                      <div key={item.id || index} className="flex items-center justify-between p-3">
                        <div>
                          <p className="font-medium text-foreground">{item.quantity}x {itemName}{variation}</p>
                          <p className="text-sm text-muted-foreground">Rs. {unitPrice.toLocaleString()} each</p>
                        </div>
                        <p className="font-semibold text-foreground">Rs. {totalPrice.toLocaleString()}</p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Special Instructions */}
              {getOrderValue(selectedOrder, 'specialInstructions') && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-foreground">Special Instructions</h3>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-sm text-foreground">{getOrderValue(selectedOrder, 'specialInstructions') as string}</p>
                  </div>
                </div>
              )}

              {/* Order Total */}
              <div className="rounded-lg border border-border p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground">Rs. {selectedOrder.subtotal.toLocaleString()}</span>
                </div>
                {(getOrderValue(selectedOrder, 'deliveryFee') as number) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Delivery Fee</span>
                    <span className="text-foreground">Rs. {(getOrderValue(selectedOrder, 'deliveryFee') as number).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-2">
                  <span className="font-bold text-foreground">Total</span>
                  <span className="text-lg font-bold text-brand-red">Rs. {(selectedOrder.total || selectedOrder.total_amount || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border bg-muted/30">
            <div className="text-center">
              <Clock className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">Select an order to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-red" />
      </div>
    }>
      <OrdersContent />
    </Suspense>
  )
}
