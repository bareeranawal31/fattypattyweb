"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Bell, ChevronRight, CircleAlert, MessageSquareText, Package, Truck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type NotificationKind = 'order' | 'delivery' | 'support'

interface OrderRow {
  id: string | number
  order_number?: string
  status?: string
  created_at?: string
  createdAt?: string
  customer_name?: string
  customerName?: string
}

interface SupportTicketRow {
  id: string | number
  subject?: string
  status?: string
  ticket_type?: string
  created_at?: string
  customer_name?: string
}

interface AdminNotification {
  id: string
  kind: NotificationKind
  title: string
  description: string
  href: string
  createdAt: string
}

interface SnapshotState {
  orders: Record<string, string>
  supportTickets: Record<string, string>
}

const STORAGE_KEY = 'fatty-patty-admin-notifications'
const SNAPSHOT_KEY = 'fatty-patty-admin-notification-snapshot'

function loadStoredNotifications(): AdminNotification[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AdminNotification[]) : []
  } catch {
    return []
  }
}

function loadSnapshot(): SnapshotState {
  return {
    orders: {},
    supportTickets: {},
  }
}

function saveNotifications(notifications: AdminNotification[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, 50)))
}

function saveSnapshot(snapshot: SnapshotState) {
  if (typeof window === 'undefined') return
  localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot))
}

function readSnapshot(): SnapshotState {
  if (typeof window === 'undefined') return loadSnapshot()

  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY)
    if (!raw) return loadSnapshot()
    const parsed = JSON.parse(raw) as SnapshotState
    return {
      orders: parsed.orders || {},
      supportTickets: parsed.supportTickets || {},
    }
  } catch {
    return loadSnapshot()
  }
}

function toOrderStatusLabel(status?: string) {
  return (status || 'pending').replace(/_/g, ' ')
}

function buildNotifications(
  orders: OrderRow[],
  supportTickets: SupportTicketRow[],
  snapshot: SnapshotState,
): { notifications: AdminNotification[]; nextSnapshot: SnapshotState } {
  const nextSnapshot: SnapshotState = {
    orders: { ...snapshot.orders },
    supportTickets: { ...snapshot.supportTickets },
  }
  const notifications: AdminNotification[] = []

  orders.forEach((order) => {
    const id = String(order.id)
    const nextStatus = (order.status || 'pending').toLowerCase()
    const previousStatus = nextSnapshot.orders[id]
    const orderNumber = order.order_number || `#${id}`
    const createdAt = order.created_at || order.createdAt || new Date().toISOString()

    if (!previousStatus) {
      notifications.push({
        id: `order-new-${id}`,
        kind: 'order',
        title: `New order ${orderNumber}`,
        description: 'A customer just placed a new order.',
        href: `/admin/orders?order=${id}`,
        createdAt,
      })
    } else if (previousStatus !== nextStatus) {
      const isDelivered = nextStatus === 'delivered'
      notifications.push({
        id: `order-status-${id}-${nextStatus}`,
        kind: isDelivered ? 'delivery' : 'order',
        title: isDelivered ? `Order ${orderNumber} delivered` : `Order ${orderNumber} updated`,
        description: `Status changed to ${toOrderStatusLabel(nextStatus)}.`,
        href: `/admin/orders?order=${id}`,
        createdAt,
      })
    }

    nextSnapshot.orders[id] = nextStatus
  })

  supportTickets.forEach((ticket) => {
    const id = String(ticket.id)
    const nextStatus = (ticket.status || 'open').toLowerCase()
    const previousStatus = nextSnapshot.supportTickets[id]
    const createdAt = ticket.created_at || new Date().toISOString()
    const subject = ticket.subject || 'Customer query'

    if (!previousStatus) {
      notifications.push({
        id: `support-new-${id}`,
        kind: 'support',
        title: 'New customer query',
        description: subject,
        href: '/admin/support',
        createdAt,
      })
    } else if (previousStatus !== nextStatus) {
      notifications.push({
        id: `support-status-${id}-${nextStatus}`,
        kind: 'support',
        title: 'Support ticket updated',
        description: `${subject} is now ${toOrderStatusLabel(nextStatus)}.`,
        href: '/admin/support',
        createdAt,
      })
    }

    nextSnapshot.supportTickets[id] = nextStatus
  })

  return { notifications, nextSnapshot }
}

function NotificationIcon({ kind }: { kind: NotificationKind }) {
  if (kind === 'delivery') return <Truck className="h-4 w-4 text-green-600" />
  if (kind === 'support') return <MessageSquareText className="h-4 w-4 text-blue-600" />
  return <Package className="h-4 w-4 text-brand-red" />
}

export function AdminNotifications() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    setNotifications(loadStoredNotifications())
    const snapshot = readSnapshot()
    const hasStoredSnapshot = typeof window !== 'undefined' && Boolean(localStorage.getItem(SNAPSHOT_KEY))

    const fetchNotifications = async () => {
      try {
        const [ordersResponse, supportResponse] = await Promise.all([
          fetch('/api/admin/orders?limit=50', { cache: 'no-store' }),
          fetch('/api/admin/support?status=all', { cache: 'no-store' }),
        ])

        const [ordersJson, supportJson] = await Promise.all([
          ordersResponse.json(),
          supportResponse.json(),
        ])

        const orders = Array.isArray(ordersJson.data) ? (ordersJson.data as OrderRow[]) : []
        const supportTickets = Array.isArray(supportJson.data) ? (supportJson.data as SupportTicketRow[]) : []

        const { notifications: nextNotifications, nextSnapshot } = buildNotifications(
          orders,
          supportTickets,
          snapshot,
        )

        if (!hasStoredSnapshot) {
          saveSnapshot(nextSnapshot)
          return
        }

        if (nextNotifications.length > 0) {
          setNotifications((current) => {
            const merged = [...nextNotifications, ...current]
            const unique = Array.from(new Map(merged.map((item) => [item.id, item])).values())
            saveNotifications(unique)
            return unique.slice(0, 50)
          })
        }

        saveSnapshot(nextSnapshot)
        setUnreadCount((current) => current + nextNotifications.length)
      } catch {
        // Keep the bell usable even when the APIs are temporarily unavailable.
      }
    }

    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const visibleNotifications = useMemo(() => notifications.slice(0, 10), [notifications])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-muted"
          aria-label="Admin notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -right-1 -top-1 min-w-5 rounded-full bg-brand-red px-1.5 py-0 text-[10px] text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[22rem] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <DropdownMenuLabel className="p-0 text-sm font-semibold">Notifications</DropdownMenuLabel>
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setUnreadCount(0)}
          >
            Mark read
          </button>
        </div>
        <div className="max-h-[24rem] overflow-y-auto">
          {visibleNotifications.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">No new notifications yet.</div>
          ) : (
            visibleNotifications.map((notification) => (
              <Link
                key={notification.id}
                href={notification.href}
                className="flex items-start gap-3 border-b px-4 py-3 transition-colors hover:bg-muted/50"
                onClick={() => setUnreadCount((count) => Math.max(0, count - 1))}
              >
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                  <NotificationIcon kind={notification.kind} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">{notification.title}</p>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{notification.description}</p>
                </div>
              </Link>
            ))
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="px-4 py-3">
          <Link href="/admin/orders" className="text-xs font-medium text-brand-red hover:underline">
            View all orders
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}