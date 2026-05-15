"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  LayoutDashboard, 
  ShoppingBag, 
  UtensilsCrossed, 
  Tag,
  Settings,
  Menu,
  X,
  ChevronLeft,
  LogOut,
  MessageSquare,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, adminOnly: false },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingBag, adminOnly: false },
  { href: '/admin/categories', label: 'Categories', icon: UtensilsCrossed, adminOnly: true },
  { href: '/admin/menu', label: 'Menu', icon: UtensilsCrossed, adminOnly: true },
  { href: '/admin/deals', label: 'Deals', icon: Tag, adminOnly: true },
  { href: '/admin/reviews', label: 'Reviews', icon: MessageSquare, adminOnly: true },
  { href: '/admin/support', label: 'Support', icon: MessageSquare, adminOnly: false },
  { href: '/admin/customers', label: 'Customers', icon: Users, adminOnly: true },
  { href: '/admin/settings', label: 'Settings', icon: Settings, adminOnly: true },
]

interface User {
  name: string
  role: 'admin' | 'staff'
  email: string
  loginTime: string
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const isAdminAuthRoute = pathname.startsWith('/admin/login')
  const isStaffDashboard = pathname === '/admin/staff-dashboard'

  // Check authentication on mount and route changes
  useEffect(() => {
    if (isAdminAuthRoute) {
      setIsAuthenticated(true) // Allow login page
      return
    }
    
    try {
      const userJson = sessionStorage.getItem('fpUser')
      if (!userJson) {
        router.push('/admin/login')
        return
      }
      
      const userData = JSON.parse(userJson)
      setUser(userData)
      setIsAuthenticated(true)

      // Redirect staff to staff dashboard if trying to access main admin
      if (userData.role === 'staff' && pathname === '/admin' && !isStaffDashboard) {
        router.push('/admin/staff-dashboard')
      }

      // Redirect staff away from admin-only pages
      if (userData.role === 'staff') {
        const isAdminOnly = navItems.some(
          item => item.adminOnly && (pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href)))
        )
        if (isAdminOnly) {
          router.push('/admin/staff-dashboard')
        }
      }
    } catch (error) {
      router.push('/admin/login')
    }
  }, [isAdminAuthRoute, pathname, router, isStaffDashboard])

  // Don't show sidebar on login page
  if (isAdminAuthRoute) {
    return <>{children}</>
  }

  // Show loading while checking auth
  if (isAuthenticated === null || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  const handleLogout = () => {
    setIsLoggingOut(true)
    sessionStorage.removeItem('fpUser')
    sessionStorage.removeItem('adminAuth') // Legacy cleanup
    router.push('/admin/login')
  }

  const dashboardHref = user.role === 'staff' ? '/admin/staff-dashboard' : '/admin'
  const visibleNavItems = navItems.map((item) =>
    item.href === '/admin' && user.role === 'staff'
      ? { ...item, href: dashboardHref }
      : item,
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-brand-dark/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 z-50 h-full w-64 border-r border-border bg-card transition-transform lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <Link href={dashboardHref} className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-red">
              <span className="text-sm font-bold text-primary-foreground">FP</span>
            </div>
            <div className="flex flex-col gap-0">
              <span className="font-bold text-foreground text-sm">Fatty Patty</span>
              <span className="text-xs text-muted-foreground">{user.role === 'admin' ? '👑 Admin' : '👤 Staff'}</span>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {visibleNavItems.map((item) => {
            // Hide admin-only items for staff
            if (item.adminOnly && user.role === 'staff') {
              return null
            }

            const isActive = pathname === item.href || 
              (item.href !== '/admin' && pathname.startsWith(item.href))
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-brand-red text-primary-foreground" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="absolute bottom-4 left-4 right-4 space-y-2">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Store
          </Link>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex w-full items-center gap-2 rounded-lg border border-destructive/30 px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
            {isLoggingOut ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-card px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex flex-col gap-0">
            <span className="font-bold text-foreground text-sm">Fatty Patty</span>
            <span className="text-xs text-muted-foreground">{user.role === 'admin' ? '👑 Admin' : '👤 Staff'}</span>
          </div>
        </header>

        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
