'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Clock, LogOut, MessageSquare, ShoppingBag } from 'lucide-react'
import { toast } from '@/lib/notify'
import { clearStoredAdminUser, getStoredAdminUser } from '@/lib/admin-auth'

interface DashboardStats {
  totalOrders: number
  activeOrders: number
  completedToday: number
  pendingSupport: number
}

interface OrderLike {
  status?: string
  completedAt?: string
  created_at?: string
  createdAt?: string
}

function toArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (value && typeof value === 'object' && Array.isArray((value as { data?: unknown }).data)) {
    return (value as { data: T[] }).data
  }
  return []
}

export default function StaffDashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    activeOrders: 0,
    completedToday: 0,
    pendingSupport: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<{ name: string } | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    try {
      const userData = getStoredAdminUser()
      if (!userData) {
        router.push('/admin/login')
        return
      }

      if (userData.role !== 'staff') {
        router.push('/admin')
        return
      }

      setUser(userData)
    } catch {
      router.push('/admin/login')
      return
    }

    loadStats()
  }, [router])

  const loadStats = async () => {
    setIsLoading(true)

    try {
      const [ordersRes, supportRes] = await Promise.all([
        fetch('/api/admin/orders?status=all&limit=200', { cache: 'no-store' }),
        fetch('/api/admin/support?status=all', { cache: 'no-store' }),
      ])

      const ordersJson = ordersRes.ok ? await ordersRes.json() : []
      const supportJson = supportRes.ok ? await supportRes.json() : []

      const orders = toArray<OrderLike>(ordersJson)
      const tickets = toArray<{ status?: string }>(supportJson)

      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      const totalOrders = orders.length
      const activeOrders = orders.filter((order) => {
        const status = (order.status || '').toLowerCase()
        return status === 'confirmed' || status === 'preparing' || status === 'ready' || status === 'out_for_delivery'
      }).length
      const completedToday = orders.filter((order) => {
        const status = (order.status || '').toLowerCase()
        const completedAt = order.completedAt || order.created_at || order.createdAt
        return ['completed', 'delivered', 'picked_up'].includes(status) && completedAt && new Date(completedAt) >= todayStart
      }).length
      const pendingSupport = tickets.filter((ticket) => (ticket.status || '').toLowerCase() !== 'resolved').length

      setStats({
        totalOrders,
        activeOrders,
        completedToday,
        pendingSupport,
      })
    } catch {
      toast.error('Failed to load dashboard stats')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    setIsLoggingOut(true)
    clearStoredAdminUser()
    sessionStorage.removeItem('adminAuth')
    router.push('/admin/login')
  }

  const StatCard = ({
    icon: Icon,
    label,
    value,
    href,
  }: {
    icon: React.ComponentType<{ className?: string }>
    label: string
    value: number
    href: string
  }) => (
    <Link href={href}>
      <div className="h-full rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold text-foreground">{value}</p>
          </div>
          <div className="rounded-full bg-brand-red/10 p-3">
            <Icon className="h-6 w-6 text-brand-red" />
          </div>
        </div>
      </div>
    </Link>
  )

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Welcome back, {user?.name}! 👤</h1>
          <p className="mt-2 text-muted-foreground">Staff Dashboard - Orders & Support Management</p>
        </div>
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex items-center gap-2 rounded-xl border border-destructive/30 px-4 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          {isLoggingOut ? 'Signing out...' : 'Sign Out'}
        </button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="rounded-2xl border border-border bg-card p-6 animate-pulse">
              <div className="mb-4 h-12 rounded-lg bg-muted" />
              <div className="h-8 w-1/2 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={ShoppingBag} label="Total Orders" value={stats.totalOrders} href="/admin/orders" />
          <StatCard icon={Clock} label="Active Orders" value={stats.activeOrders} href="/admin/orders" />
          <StatCard icon={CheckCircle} label="Completed Today" value={stats.completedToday} href="/admin/orders" />
          <StatCard icon={MessageSquare} label="Pending Support" value={stats.pendingSupport} href="/admin/support" />
        </div>
      )}

      <div>
        <h2 className="mb-4 text-xl font-bold text-foreground">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/admin/orders">
            <div className="cursor-pointer rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-lg">
              <ShoppingBag className="mb-3 h-8 w-8 text-brand-red" />
              <h3 className="mb-1 font-bold text-foreground">Manage Orders</h3>
              <p className="text-sm text-muted-foreground">View and update order statuses</p>
            </div>
          </Link>
          <Link href="/admin/support">
            <div className="cursor-pointer rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-lg">
              <MessageSquare className="mb-3 h-8 w-8 text-brand-red" />
              <h3 className="mb-1 font-bold text-foreground">Support Tickets</h3>
              <p className="text-sm text-muted-foreground">Reply to customer support queries</p>
            </div>
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-brand-red/5 p-5 lg:p-6">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">Staff Access:</span> As a staff member, you can view and manage orders and support tickets. For additional permissions, please contact your Admin.
        </p>
      </div>
    </div>
  )
}
