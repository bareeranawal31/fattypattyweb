'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BellRing, ChevronRight, Loader2, RefreshCw } from 'lucide-react'

interface NotificationItem {
  id: string
  type: 'order' | 'delivery' | 'support'
  title: string
  message: string
  status: string
  created_at: string
  href: string
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchNotifications = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch('/api/admin/notifications', { cache: 'no-store' })
      const data = await response.json()
      setNotifications(Array.isArray(data.data) ? data.data : [])
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-brand-red">
            <BellRing className="h-5 w-5" />
            <span className="text-sm font-semibold uppercase tracking-[0.2em]">Notifications</span>
          </div>
          <h1 className="mt-2 text-3xl font-bold text-foreground">All Notifications</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Recent order placed, cancelled, customer query, and complaint updates.
          </p>
        </div>
        <button
          onClick={fetchNotifications}
          disabled={isRefreshing}
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center rounded-2xl border border-border bg-card">
          <Loader2 className="h-8 w-8 animate-spin text-brand-red" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No notifications yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="divide-y divide-border">
            {notifications.map((notification) => (
              <Link
                key={notification.id}
                href={notification.href}
                className="flex items-start justify-between gap-4 p-4 transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-foreground">{notification.title}</p>
                    <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {notification.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-right">
                  <p className="text-xs text-muted-foreground">{formatTime(notification.created_at)}</p>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
