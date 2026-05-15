'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingBag, CheckCircle, Clock, MessageSquare, LogOut, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { toast } from '@/lib/notify'

interface DashboardStats {
  newOrders: number
  activeOrders: number
  completedToday: number
  pendingSupport: number
}

export default function StaffDashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    newOrders: 0,
    activeOrders: 0,
    completedToday: 0,
    pendingSupport: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<{ name: string } | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    // Verify user is staff
    try {
      const userJson = sessionStorage.getItem('fpUser')
      if (!userJson) {
        router.push('/admin/login')
        return
      }
      const userData = JSON.parse(userJson)
      if (userData.role !== 'staff') {
        router.push('/admin')
        return
      }
      setUser(userData)
    } catch (error) {
      router.push('/admin/login')
      return
    }

    // Load dashboard stats
    loadStats()
  }, [router])

  const loadStats = async () => {
    try {
      setIsLoading(true)
      
      // Fetch orders
      const ordersRes = await fetch('/api/orders')
      const orders = ordersRes.ok ? await ordersRes.json() : []
      
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      const newOrders = orders.filter((o: any) => o.status === 'pending').length
      const activeOrders = orders.filter((o: any) => o.status === 'confirmed' || o.status === 'preparing').length
      const completedToday = orders.filter((o: any) => {
        return o.status === 'completed' && o.completedAt && new Date(o.completedAt) >= todayStart
      }).length

      // Fetch support tickets
      const supportRes = await fetch('/api/admin/support')
      const tickets = supportRes.ok ? await supportRes.json() : []
      const pendingSupport = tickets.filter((t: any) => t.status !== 'resolved').length

      setStats({
        newOrders,
        activeOrders,
        completedToday,
        pendingSupport,
      })
    } catch (error) {
      toast.error('Failed to load dashboard stats')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    setIsLoggingOut(true)
    sessionStorage.removeItem('fpUser')
    sessionStorage.removeItem('adminAuth')
    router.push('/admin/login')
  }

  const StatCard = ({ icon: Icon, label, value, href }: { icon: any; label: string; value: number; href: string }) => (
    <Link href={href}>
      <div className="rounded-2xl border border-border bg-card p-6 hover:shadow-lg transition-shadow cursor-pointer h-full">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-2">{label}</p>
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
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <div className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
        <Link href="/" className="rounded-lg p-2 text-muted-foreground hover:bg-muted">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <span className="font-bold text-foreground text-sm">👤 Staff Dashboard</span>
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="rounded-lg p-2 text-destructive hover:bg-destructive/10"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>

      <div className="lg:pl-64">
        <main className="p-4 lg:p-8">
          {/* Header */}
          <div className="mb-8 hidden lg:block">
            <div className="flex items-center justify-between">
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
          </div>

          {/* Stats Grid */}
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-2xl border border-border bg-card p-6 animate-pulse">
                  <div className="h-12 bg-muted rounded-lg mb-4" />
                  <div className="h-8 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={ShoppingBag}
                label="New Orders"
                value={stats.newOrders}
                href="/admin/orders"
              />
              <StatCard
                icon={Clock}
                label="Active Orders"
                value={stats.activeOrders}
                href="/admin/orders"
              />
              <StatCard
                icon={CheckCircle}
                label="Completed Today"
                value={stats.completedToday}
                href="/admin/orders"
              />
              <StatCard
                icon={MessageSquare}
                label="Pending Support"
                value={stats.pendingSupport}
                href="/admin/support"
              />
            </div>
          )}

          {/* Quick Actions */}
          <div className="mt-8">
            <h2 className="text-xl font-bold text-foreground mb-4">Quick Actions</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Link href="/admin/orders">
                <div className="rounded-2xl border border-border bg-card p-6 hover:shadow-lg transition-shadow cursor-pointer">
                  <ShoppingBag className="h-8 w-8 text-brand-red mb-3" />
                  <h3 className="font-bold text-foreground mb-1">Manage Orders</h3>
                  <p className="text-sm text-muted-foreground">View and update order statuses</p>
                </div>
              </Link>
              <Link href="/admin/support">
                <div className="rounded-2xl border border-border bg-card p-6 hover:shadow-lg transition-shadow cursor-pointer">
                  <MessageSquare className="h-8 w-8 text-brand-red mb-3" />
                  <h3 className="font-bold text-foreground mb-1">Support Tickets</h3>
                  <p className="text-sm text-muted-foreground">Reply to customer support queries</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Info Banner */}
          <div className="mt-8 rounded-2xl border border-border bg-brand-red/5 p-6">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Staff Access:</span> As a staff member, you can view and manage orders and support tickets. For additional permissions, please contact your Admin.
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}
