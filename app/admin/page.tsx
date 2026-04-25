"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { 
  DollarSign, 
  ShoppingBag, 
  Clock, 
  TrendingUp,
  ArrowRight,
  Loader2,
  RefreshCw
} from 'lucide-react'

interface Stats {
  todayRevenue: number
  todayOrders: number
  pendingOrders: number
  totalOrders: number
  completedToday: number
}

interface Order {
  id: string | number
  order_number: string
  customer_name?: string
  customerName?: string
  status: string
  total_amount?: number
  total?: number
  order_type?: string
  orderType?: string
  created_at?: string
  createdAt?: string
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = async () => {
    setIsLoading(true)
    try {
      // Try fetching from API first
      let apiSuccess = false
      try {
        const [statsResponse, ordersResponse] = await Promise.all([
          fetch('/api/admin/stats'),
          fetch('/api/admin/orders?limit=5'),
        ])

        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          if (statsData.data) {
            setStats(statsData.data)
            apiSuccess = true
          }
        }

        if (ordersResponse.ok) {
          const ordersData = await ordersResponse.json()
          if (ordersData.data) {
            const normalizedOrders = ordersData.data.map((order: Order) => ({
              id: String(order.id),
              order_number: order.order_number,
              customer_name: order.customer_name || order.customerName || 'Unknown',
              status: order.status || 'pending',
              total_amount: order.total_amount || order.total || 0,
              order_type: order.order_type || order.orderType || 'delivery',
              created_at: order.created_at || order.createdAt || new Date().toISOString(),
            }))
            setRecentOrders(normalizedOrders.slice(0, 5))
          }
        }
      } catch (apiError) {
        console.warn('API fetch failed, falling back to localStorage:', apiError)
      }

      // Fall back to localStorage if API failed
      if (!apiSuccess) {
        const orders = JSON.parse(localStorage.getItem('orders') || '[]')
        
        const today = new Date().toDateString()
        
        const todaysOrders = orders.filter((order: Order) => {
          const orderDate = new Date(order.created_at || order.createdAt || '').toDateString()
          return orderDate === today
        })
        
        const todaysRevenue = todaysOrders.reduce((total: number, order: Order) => {
          return total + (order.total_amount || order.total || 0)
        }, 0)
        
        const pendingOrders = orders.filter((order: Order) => 
          (order.status || '').toLowerCase() === 'pending'
        ).length
        
        const totalOrders = orders.length
        
        setStats({
          todayRevenue: todaysRevenue,
          todayOrders: todaysOrders.length,
          pendingOrders: pendingOrders,
          totalOrders: totalOrders,
          completedToday: todaysOrders.filter((o: Order) => 
            (o.status || '').toLowerCase() === 'delivered'
          ).length,
        })
        
        const sortedOrders = [...orders].sort((a: Order, b: Order) => {
          const dateA = new Date(a.created_at || a.createdAt || 0)
          const dateB = new Date(b.created_at || b.createdAt || 0)
          return dateB.getTime() - dateA.getTime()
        }).slice(0, 5)
        
        const normalizedOrders = sortedOrders.map((order: Order) => ({
          id: String(order.id),
          order_number: order.order_number,
          customer_name: order.customer_name || order.customerName || 'Unknown',
          status: order.status || 'pending',
          total_amount: order.total_amount || order.total || 0,
          order_type: order.order_type || order.orderType || 'delivery',
          created_at: order.created_at || order.createdAt || new Date().toISOString(),
        }))
        
        setRecentOrders(normalizedOrders)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const formatCurrency = (amount: number) => {
    return `Rs. ${amount.toLocaleString()}`
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      preparing: 'bg-orange-100 text-orange-800',
      ready: 'bg-green-100 text-green-800',
      out_for_delivery: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      picked_up: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  if (isLoading && !stats) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-red" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome back to Fatty Patty Admin</p>
        </div>
        <button
          onClick={fetchData}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Today{"'"}s Revenue</p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {formatCurrency(stats?.todayRevenue || 0)}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Today{"'"}s Orders</p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {stats?.todayOrders || 0}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <ShoppingBag className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending Orders</p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {stats?.pendingOrders || 0}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Orders</p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {stats?.totalOrders || 0}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-6">
          <h2 className="text-lg font-bold text-foreground">Recent Orders</h2>
          <Link
            href="/admin/orders"
            className="flex items-center gap-1 text-sm font-medium text-brand-red hover:underline"
          >
            View All
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        
        {recentOrders.length === 0 ? (
          <div className="p-8 text-center">
            <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <p className="mt-2 text-sm text-muted-foreground">No orders yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/orders?order=${order.id}`}
                className="flex items-center justify-between p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-semibold text-foreground">{order.order_number}</p>
                    <p className="text-sm text-muted-foreground">{order.customer_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${getStatusColor(order.status)}`}>
                    {order.status.replace('_', ' ')}
                  </span>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">{formatCurrency(order.total_amount)}</p>
                    <p className="text-xs text-muted-foreground">{formatTime(order.created_at)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/admin/orders?status=pending"
          className="flex items-center gap-4 rounded-xl border border-border bg-card p-6 transition-all hover:border-brand-red hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
            <Clock className="h-6 w-6 text-yellow-600" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Pending Orders</p>
            <p className="text-sm text-muted-foreground">View and manage pending orders</p>
          </div>
        </Link>

        <Link
          href="/admin/menu"
          className="flex items-center gap-4 rounded-xl border border-border bg-card p-6 transition-all hover:border-brand-red hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <ShoppingBag className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Manage Menu</p>
            <p className="text-sm text-muted-foreground">Update items and availability</p>
          </div>
        </Link>

        <Link
          href="/admin/deals"
          className="flex items-center gap-4 rounded-xl border border-border bg-card p-6 transition-all hover:border-brand-red hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <DollarSign className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Manage Deals</p>
            <p className="text-sm text-muted-foreground">Configure promotions and deals</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
