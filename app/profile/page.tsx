"use client"

import { useEffect, useMemo, useState, type ComponentType } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Eye,
  EyeOff,
  Heart,
  Loader2,
  LogOut,
  MapPin,
  MessageCircleQuestion,
  ShoppingBag,
  TicketPercent,
  XCircle,
  UserRound,
} from 'lucide-react'
import { toast } from '@/lib/notify'
import { useAdminSettings } from '@/lib/admin-settings'
import { useCustomerAuth } from '@/lib/customer-auth-context'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { deliveryAreas as fallbackDeliveryAreas } from '@/lib/service-areas'
import { menuItems } from '@/lib/menu-data'
import { useCart, type CartItemAddOn } from '@/lib/cart-context'

type TicketType = 'query' | 'complaint' | 'request'

type StatusTab = 'overview' | 'account' | 'addresses' | 'orders' | 'favorites' | 'support'

interface AccountRow {
  id: string
  name: string | null
  email: string
  phone: string | null
  loyalty_points: number
}

interface AddressRow {
  id: string
  label: string
  address_line: string
  area: string | null
  city: string | null
  notes: string | null
  is_default: boolean
}

interface FavoriteRow {
  menu_item_id: string
}

interface OrderItemRow {
  id?: string
  type?: 'menu_item' | 'deal'
  name?: string
  item_name?: string
  quantity?: number
  addOns?: Array<{ id: string; name: string; price: number }>
  add_ons?: Array<{ id: string; name: string; price: number }>
  specialInstructions?: string
}

interface OrderRow {
  id: string
  order_number: string
  status: string
  total: number
  created_at: string
  items: OrderItemRow[]
}

interface SupportTicket {
  id: string
  subject: string
  message: string
  ticket_type: TicketType
  status: 'open' | 'answered' | 'closed'
  admin_reply: string | null
  created_at: string
  reply_at: string | null
}

interface BranchApiRow {
  delivery_areas?: Array<{ area_name?: string; is_active?: boolean }>
}

const ALL_TICKETS_KEY = 'support-tickets:all'
const CUSTOMER_PROFILE_FALLBACK_PREFIX = 'customer-profile-fallback:'
const CUSTOMER_FAVORITES_FALLBACK_PREFIX = 'customer-favorites:'
const CUSTOMER_ORDERS_FALLBACK_PREFIX = 'customer-orders:'
const CUSTOMER_ADDRESSES_FALLBACK_PREFIX = 'customer-addresses:'
const LOYALTY_FIXED_POINTS = 15
const LOYALTY_MIN_ORDER_AMOUNT = 1500
const LOYALTY_REDEEM_VALUE_PER_POINT = 1

function getProfileFallbackKey(userId: string) {
  return `${CUSTOMER_PROFILE_FALLBACK_PREFIX}${userId}`
}

function getFavoritesFallbackKey(userId: string) {
  return `${CUSTOMER_FAVORITES_FALLBACK_PREFIX}${userId}`
}

function getOrdersFallbackKey(userId: string) {
  return `${CUSTOMER_ORDERS_FALLBACK_PREFIX}${userId}`
}

function getAddressesFallbackKey(userId: string) {
  return `${CUSTOMER_ADDRESSES_FALLBACK_PREFIX}${userId}`
}

function getUserTicketsKey(userId: string) {
  return `support-tickets:${userId}`
}

const ticketTypeOptions: Array<{ value: TicketType; label: string }> = [
  { value: 'query', label: 'Query' },
  { value: 'complaint', label: 'Complaint' },
  { value: 'request', label: 'Request' },
]

function getOrderItemName(item: OrderItemRow, index: number) {
  return item.name || item.item_name || `Item ${index + 1}`
}

function getOrderItemAddOns(item: OrderItemRow) {
  return item.addOns || item.add_ons || []
}

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createSupabaseClient()
  const { user, profile: authProfile, loading, signOut } = useCustomerAuth()
  const { addMenuItem } = useCart()
  const settings = useAdminSettings()

  const [activeTab, setActiveTab] = useState<StatusTab>('overview')
  const [isLoading, setIsLoading] = useState(false)

  const [account, setAccount] = useState<AccountRow | null>(null)
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [addresses, setAddresses] = useState<AddressRow[]>([])
  const [favorites, setFavorites] = useState<FavoriteRow[]>([])
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [deliveryAreaOptions, setDeliveryAreaOptions] = useState<string[]>(fallbackDeliveryAreas)

  const [accountForm, setAccountForm] = useState({ name: '', phone: '' })
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  const [addressForm, setAddressForm] = useState({
    label: 'Home',
    address_line: '',
    area: '',
    city: 'Karachi',
    notes: '',
    is_default: false,
  })

  const [supportForm, setSupportForm] = useState({
    ticketType: 'query' as TicketType,
    subject: '',
    message: '',
  })
  const [showSignOutChoice, setShowSignOutChoice] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const points = Number(authProfile?.current_points ?? account?.loyalty_points ?? 0)
  const pointValue = points * LOYALTY_REDEEM_VALUE_PER_POINT
  const lifetimePoints = Number(authProfile?.lifetime_points_earned || 0)
  const redeemedPoints = Number(authProfile?.total_points_redeemed || 0)

  const favoriteIds = useMemo(() => new Set(favorites.map((fav) => fav.menu_item_id)), [favorites])
  const favoriteItems = useMemo(
    () => menuItems.filter((item) => favoriteIds.has(item.id)),
    [favoriteIds],
  )

  useEffect(() => {
    let isCancelled = false

    const loadDeliveryAreas = async () => {
      try {
        const response = await fetch('/api/branches', { cache: 'no-store' })
        const result = await response.json()
        if (!response.ok || !Array.isArray(result.data) || isCancelled) {
          return
        }

        const areas = Array.from(
          new Set(
            (result.data as BranchApiRow[])
              .flatMap((branch) => branch.delivery_areas || [])
              .filter((area) => area.is_active !== false)
              .map((area) => area.area_name?.trim() || '')
              .filter(Boolean),
          ),
        )

        if (areas.length > 0) {
          setDeliveryAreaOptions(areas)
        }
      } catch {
        // keep fallback delivery areas
      }
    }

    loadDeliveryAreas()

    return () => {
      isCancelled = true
    }
  }, [])

  const loadDashboardData = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      const [accountRes, ordersRes, addressesRes, favoritesRes, supportRes] = await Promise.all([
        fetch('/api/customer/account', { cache: 'no-store' }),
        fetch('/api/customer/orders', { cache: 'no-store' }),
        fetch('/api/customer/addresses', { cache: 'no-store' }),
        fetch('/api/customer/favorites', { cache: 'no-store' }),
        fetch('/api/customer/support', { cache: 'no-store' }),
      ])

      const [accountData, ordersData, addressesData, favoritesData, supportData] = await Promise.all([
        accountRes.json(),
        ordersRes.json(),
        addressesRes.json(),
        favoritesRes.json(),
        supportRes.json(),
      ])

      if (accountRes.ok && accountData.data) {
        const accountRow = accountData.data as AccountRow
        setAccount(accountRow)
        setAccountForm({
          name: accountRow.name || '',
          phone: accountRow.phone || '',
        })
      } else {
        const fallbackAccount: AccountRow = {
          id: user.id,
          name: authProfile?.full_name || (user.user_metadata?.full_name as string | undefined) || null,
          email: user.email || '',
          phone: (user.user_metadata?.phone as string | undefined) || null,
          loyalty_points: Number(authProfile?.current_points || 0),
        }
        setAccount(fallbackAccount)
        setAccountForm({
          name: fallbackAccount.name || '',
          phone: fallbackAccount.phone || '',
        })
      }

      let nextOrders: OrderRow[] = []
      if (ordersRes.ok && Array.isArray(ordersData.data)) {
        nextOrders = ordersData.data as OrderRow[]
      }

      try {
        const localOrdersRaw = localStorage.getItem('orders')
        const localOrders = localOrdersRaw ? (JSON.parse(localOrdersRaw) as Array<Record<string, unknown>>) : []
        const fromLocal: OrderRow[] = localOrders
          .filter((order) => {
            const customerId = String(order.customer_id || '')
            const userId = String(order.user_id || '')
            return customerId === user.id || userId === user.id
          })
          .map((order) => ({
            id: String(order.id || order.order_number || Date.now()),
            order_number: String(order.order_number || ''),
            status: String(order.status || 'pending'),
            total: Number(order.total || 0),
            created_at: String(order.created_at || order.createdAt || new Date().toISOString()),
            items: Array.isArray(order.items) ? (order.items as OrderItemRow[]) : [],
          }))

        const merged = [...nextOrders, ...fromLocal]
        const deduped = Array.from(new Map(merged.map((order) => [order.order_number || order.id, order])).values())
        deduped.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        nextOrders = deduped
      } catch {
        // ignore local fallback parse errors
      }

      setOrders(nextOrders)
      localStorage.setItem(getOrdersFallbackKey(user.id), JSON.stringify(nextOrders))

      if (addressesRes.ok && Array.isArray(addressesData.data)) {
        const nextAddresses = addressesData.data as AddressRow[]
        setAddresses(nextAddresses)
        localStorage.setItem(getAddressesFallbackKey(user.id), JSON.stringify(nextAddresses))
      } else {
        const fallbackRaw = localStorage.getItem(getAddressesFallbackKey(user.id))
        setAddresses(fallbackRaw ? (JSON.parse(fallbackRaw) as AddressRow[]) : [])
      }

      let nextFavorites: FavoriteRow[] = []
      if (favoritesRes.ok && Array.isArray(favoritesData.data)) {
        nextFavorites = favoritesData.data as FavoriteRow[]
      } else {
        const fallbackRaw = localStorage.getItem(getFavoritesFallbackKey(user.id))
        nextFavorites = fallbackRaw ? (JSON.parse(fallbackRaw) as FavoriteRow[]) : []
      }
      setFavorites(nextFavorites)
      localStorage.setItem(getFavoritesFallbackKey(user.id), JSON.stringify(nextFavorites))

      if (supportRes.ok && Array.isArray(supportData.data)) {
        const apiTickets = supportData.data as SupportTicket[]
        setTickets(apiTickets)
        localStorage.setItem(getUserTicketsKey(user.id), JSON.stringify(apiTickets))
      } else {
        const raw = localStorage.getItem(getUserTicketsKey(user.id))
        setTickets(raw ? (JSON.parse(raw) as SupportTicket[]) : [])
      }

    } catch (error) {
      console.error(error)
      toast.error('Could not load full account data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [user])

  const saveAccount = async () => {
    try {
      const response = await fetch('/api/customer/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: accountForm.name,
          phone: accountForm.phone,
        }),
      })
      const result = await response.json()
      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to save profile')
      }
      setAccount(result.data)
      toast.success('Profile updated')
    } catch (error) {
      if (!user) {
        toast.error(error instanceof Error ? error.message : 'Failed to save profile')
        return
      }

      const fallbackAccount: AccountRow = {
        id: user.id,
        name: accountForm.name || null,
        email: user.email || '',
        phone: accountForm.phone || null,
        loyalty_points: Number(account?.loyalty_points || authProfile?.current_points || 0),
      }

      setAccount(fallbackAccount)

      try {
        localStorage.setItem(
          getProfileFallbackKey(user.id),
          JSON.stringify({
            id: user.id,
            email: user.email || '',
            full_name: fallbackAccount.name,
            current_points: fallbackAccount.loyalty_points,
            lifetime_points_earned: authProfile?.lifetime_points_earned || 0,
            total_points_redeemed: authProfile?.total_points_redeemed || 0,
          }),
        )
      } catch {
        // ignore fallback storage error
      }

      toast.success('Profile saved locally')
    }
  }

  const changePassword = async () => {
    if (!passwordForm.newPassword) {
      toast.error('New password is required')
      return
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters')
      return
    }

    try {
      const response = await fetch('/api/customer/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordForm),
      })
      const result = await response.json()
      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to change password')
      }
      setPasswordForm({ currentPassword: '', newPassword: '' })
      toast.success('Password updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to change password')
    }
  }

  const addAddress = async () => {
    if (!addressForm.area.trim()) {
      toast.error('Please select a delivery area')
      return
    }

    if (!addressForm.address_line.trim()) {
      toast.error('Detailed address is required')
      return
    }

    try {
      if (!user) {
        throw new Error('Unauthorized')
      }

      const response = await fetch('/api/customer/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addressForm),
      })
      const result = await response.json()
      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to add address')
      }
      setAddressForm({
        label: 'Home',
        address_line: '',
        area: '',
        city: 'Karachi',
        notes: '',
        is_default: false,
      })
      await loadDashboardData()
      toast.success('Address added')
    } catch (error) {
      if (!user) {
        toast.error(error instanceof Error ? error.message : 'Failed to add address')
        return
      }

      const fallbackAddress: AddressRow = {
        id: `local-${Date.now()}`,
        label: addressForm.label.trim() || 'Home',
        address_line: addressForm.address_line.trim(),
        area: addressForm.area.trim(),
        city: addressForm.city.trim() || 'Karachi',
        notes: addressForm.notes.trim() || null,
        is_default: Boolean(addressForm.is_default),
      }

      let nextAddresses = [...addresses]
      if (fallbackAddress.is_default) {
        nextAddresses = nextAddresses.map((address) => ({ ...address, is_default: false }))
      }
      nextAddresses = [fallbackAddress, ...nextAddresses]

      setAddresses(nextAddresses)
      localStorage.setItem(getAddressesFallbackKey(user.id), JSON.stringify(nextAddresses))
      setAddressForm({
        label: 'Home',
        address_line: '',
        area: '',
        city: 'Karachi',
        notes: '',
        is_default: false,
      })
      toast.success('Address saved locally')
    }
  }

  const deleteAddress = async (id: string) => {
    try {
      const response = await fetch(`/api/customer/addresses/${id}`, { method: 'DELETE' })
      const result = await response.json()
      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to delete address')
      }
      setAddresses((prev) => prev.filter((address) => address.id !== id))
      toast.success('Address removed')
    } catch (error) {
      if (!user) {
        toast.error(error instanceof Error ? error.message : 'Failed to delete address')
        return
      }

      const nextAddresses = addresses.filter((address) => address.id !== id)
      setAddresses(nextAddresses)
      localStorage.setItem(getAddressesFallbackKey(user.id), JSON.stringify(nextAddresses))
      toast.success('Address removed locally')
    }
  }

  const setDefaultAddress = async (id: string) => {
    try {
      const response = await fetch(`/api/customer/addresses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_default: true }),
      })
      const result = await response.json()
      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to update default address')
      }
      await loadDashboardData()
      toast.success('Default address updated')
    } catch (error) {
      if (!user) {
        toast.error(error instanceof Error ? error.message : 'Failed to update default address')
        return
      }

      const nextAddresses = addresses.map((address) => ({
        ...address,
        is_default: address.id === id,
      }))
      setAddresses(nextAddresses)
      localStorage.setItem(getAddressesFallbackKey(user.id), JSON.stringify(nextAddresses))
      toast.success('Default address updated locally')
    }
  }

  const toggleFavorite = async (menuItemId: string) => {
    if (!user) {
      toast.error('Please sign in to manage favorites')
      return
    }

    try {
      const authHeaders: HeadersInit = {}
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.access_token) {
        authHeaders.Authorization = `Bearer ${session.access_token}`
      }

      if (favoriteIds.has(menuItemId)) {
        const nextFavorites = favorites.filter((item) => item.menu_item_id !== menuItemId)
        setFavorites(nextFavorites)
        localStorage.setItem(getFavoritesFallbackKey(user.id), JSON.stringify(nextFavorites))

        const response = await fetch(`/api/customer/favorites/${menuItemId}`, {
          method: 'DELETE',
          headers: authHeaders,
          credentials: 'include',
        })
        const result = await response.json()
        if (!response.ok || result.error) {
          throw new Error(result.error || 'Failed to remove favorite')
        }
      } else {
        const nextFavorites = [...favorites, { menu_item_id: menuItemId }]
        setFavorites(nextFavorites)
        localStorage.setItem(getFavoritesFallbackKey(user.id), JSON.stringify(nextFavorites))

        const response = await fetch('/api/customer/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          credentials: 'include',
          body: JSON.stringify({ menu_item_id: menuItemId }),
        })
        const result = await response.json()
        if (!response.ok || result.error) {
          throw new Error(result.error || 'Failed to add favorite')
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sync favorites'
      if (/Could not find the table|relation .* does not exist|Unauthorized/i.test(message)) {
        toast.info('Favorite saved locally. Backend sync will work after favorites table setup.')
        return
      }
      toast.info(`${message}. Saved locally.`)
    }
  }

  const submitSupport = async () => {
    if (!supportForm.subject.trim() || !supportForm.message.trim()) {
      toast.error('Subject and message are required')
      return
    }

    try {
      const response = await fetch('/api/customer/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketType: supportForm.ticketType,
          subject: supportForm.subject,
          message: supportForm.message,
        }),
      })
      const result = await response.json()
      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to submit support ticket')
      }
      setSupportForm({ ticketType: 'query', subject: '', message: '' })
      await loadDashboardData()
      toast.success('Support ticket submitted')
    } catch {
      if (!user) {
        toast.error('Failed to submit support ticket')
        return
      }

      const fallbackTicket: SupportTicket = {
        id: `local-${Date.now()}`,
        subject: supportForm.subject,
        message: supportForm.message,
        ticket_type: supportForm.ticketType,
        status: 'open',
        admin_reply: null,
        created_at: new Date().toISOString(),
        reply_at: null,
      }

      try {
        const userTicketsRaw = localStorage.getItem(getUserTicketsKey(user.id))
        const userTickets = userTicketsRaw ? (JSON.parse(userTicketsRaw) as SupportTicket[]) : []
        const nextUserTickets = [fallbackTicket, ...userTickets]
        localStorage.setItem(getUserTicketsKey(user.id), JSON.stringify(nextUserTickets))
        setTickets(nextUserTickets)

        const allTicketsRaw = localStorage.getItem(ALL_TICKETS_KEY)
        const allTickets = allTicketsRaw ? (JSON.parse(allTicketsRaw) as SupportTicket[]) : []
        localStorage.setItem(ALL_TICKETS_KEY, JSON.stringify([fallbackTicket, ...allTickets]))

        setSupportForm({ ticketType: 'query', subject: '', message: '' })
        toast.success('Support ticket submitted')
      } catch {
        toast.error('Failed to submit support ticket')
      }
    }
  }

  const reorder = (order: OrderRow) => {
    let added = 0

    ;(order.items || []).forEach((item) => {
      if (item.type === 'deal') {
        return
      }

      const menuItem =
        menuItems.find((m) => m.id === item.id) ||
        menuItems.find((m) => m.name.toLowerCase() === (item.name || '').toLowerCase())

      if (!menuItem) {
        return
      }

      const addOns = (item.addOns || []).map(
        (a): CartItemAddOn => ({ id: a.id, name: a.name, price: Number(a.price || 0) }),
      )

      addMenuItem({
        menuItem,
        quantity: Math.max(1, Number(item.quantity || 1)),
        addOns,
        specialInstructions: item.specialInstructions || undefined,
      })
      added += 1
    })

    if (added === 0) {
      toast.error('Could not map order items to current menu')
      return
    }

    toast.success('Items added to cart for reorder')
  }

  const cancelOrder = async (order: OrderRow) => {
    const status = order.status.toLowerCase()
    if (!['pending', 'confirmed'].includes(status)) {
      toast.error('Only pending or confirmed orders can be cancelled')
      return
    }

    try {
      const response = await fetch(`/api/customer/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelled from customer account' }),
      })

      const result = await response.json()
      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to cancel order')
      }

      setOrders((prev) =>
        prev.map((item) => (item.id === order.id ? { ...item, status: 'cancelled' } : item)),
      )
      toast.success('Order cancelled successfully')
      await loadDashboardData()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to cancel order'
      toast.error(message)
    }
  }

  const handleSignOutChoice = async (nextAction: 'signin' | 'guest') => {
    setIsSigningOut(true)
    try {
      await signOut()
      setShowSignOutChoice(false)
      if (nextAction === 'signin') {
        toast.success('Signed out. Please sign in again.')
        router.push('/auth/customer')
        return
      }

      toast.success('Signed out. Continuing as guest.')
      router.push('/')
    } finally {
      setIsSigningOut(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-red" />
      </div>
    )
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[#fff7f2] via-background to-[#fff1e8] px-4 py-20">
        <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
          <h1 className="text-2xl font-bold text-foreground">Customer Account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to manage your profile, orders, addresses, favorites, and support tickets.
          </p>
          <Link
            href="/auth/customer"
            className="mt-6 inline-flex rounded-xl bg-brand-red px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-brand-red/90"
          >
            Sign In
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#fff8ee] via-background to-[#fef1e3] px-4 py-10 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">My Account</h1>
              <p className="mt-1 text-sm text-muted-foreground">Welcome back, {account?.name || user.email}</p>
            </div>
            <button
              onClick={() => setShowSignOutChoice(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/menu"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-brand-red/90"
            >
              <ShoppingBag className="h-4 w-4" />
              Continue Ordering
            </Link>
            <Link
              href="/track"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              <MapPin className="h-4 w-4" />
              Track an Order
            </Link>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {!settings.isLoyaltyPaused && (
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <TicketPercent className="h-4 w-4 text-brand-red" />
                  Loyalty Points
                </div>
                <p className="mt-2 text-3xl font-bold text-brand-red">{points}</p>
                <p className="mt-1 text-xs text-muted-foreground">Redeemable value: Rs. {pointValue.toLocaleString()}</p>
                <p className="mt-1 text-xs text-muted-foreground">Lifetime earned: {lifetimePoints} | Redeemed: {redeemedPoints}</p>
                <p className="mt-1 text-xs text-muted-foreground">Earn {LOYALTY_FIXED_POINTS} points on orders Rs. {LOYALTY_MIN_ORDER_AMOUNT.toLocaleString()}+.</p>
              </div>
            )}

            <div className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ShoppingBag className="h-4 w-4 text-brand-red" />
                Orders
              </div>
              <p className="mt-2 text-3xl font-bold text-foreground">{orders.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">Track your latest order statuses.</p>
            </div>

            <div className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Heart className="h-4 w-4 text-brand-red" />
                Favorites
              </div>
              <p className="mt-2 text-3xl font-bold text-foreground">{favoriteItems.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">Quick access to your top picks.</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {([
              ['overview', 'Overview', UserRound],
              ['account', 'Profile', UserRound],
              ['addresses', 'Addresses', MapPin],
              ['orders', 'Orders', ShoppingBag],
              ['favorites', 'Favorites', Heart],
              ['support', 'Support', MessageCircleQuestion],
            ] as Array<[StatusTab, string, ComponentType<{ className?: string }>]>).map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm ${activeTab === key ? 'border-brand-red bg-brand-red/10 text-brand-red' : 'border-border text-muted-foreground hover:bg-muted'}`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </section>

        {isLoading && (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-brand-red" />
          </div>
        )}

        {!isLoading && activeTab === 'overview' && (
          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-bold text-foreground">Latest Orders</h2>
              <div className="mt-3 space-y-2">
                {orders.slice(0, 4).map((order) => (
                  <div key={order.id} className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{order.order_number}</p>
                      <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">Rs. {Number(order.total || 0).toLocaleString()}</p>
                      <p className="text-xs uppercase text-muted-foreground">{order.status}</p>
                    </div>
                  </div>
                ))}
                {orders.length === 0 && <p className="text-sm text-muted-foreground">No orders yet.</p>}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-bold text-foreground">Support Updates</h2>
              <div className="mt-3 space-y-2">
                {tickets.slice(0, 4).map((ticket) => (
                  <div key={ticket.id} className="rounded-lg border border-border bg-background p-3">
                    <p className="text-sm font-semibold text-foreground">{ticket.subject}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{ticket.admin_reply ? 'Replied' : 'Open'} | {ticket.ticket_type}</p>
                    {ticket.admin_reply && <p className="mt-2 text-xs text-foreground">{ticket.admin_reply}</p>}
                  </div>
                ))}
                {tickets.length === 0 && <p className="text-sm text-muted-foreground">No support tickets yet.</p>}
              </div>
            </div>
          </section>
        )}

        {!isLoading && activeTab === 'account' && (
          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-bold text-foreground">Profile Details</h2>
              <div className="mt-4 space-y-3">
                <input
                  value={accountForm.name}
                  onChange={(event) => setAccountForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Full name"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                />
                <input
                  value={user.email || account?.email || ''}
                  disabled
                  className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm"
                />
                <input
                  value={accountForm.phone}
                  onChange={(event) => setAccountForm((prev) => ({ ...prev, phone: event.target.value }))}
                  placeholder="Phone number"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                />
                <button
                  onClick={saveAccount}
                  className="rounded-xl bg-brand-red px-4 py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  Save Profile
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-bold text-foreground">Change Password</h2>
              <div className="mt-4 space-y-3">
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
                    placeholder="Current password (optional)"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 pr-11 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted"
                    aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                    placeholder="New password"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 pr-11 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted"
                    aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <button
                  onClick={changePassword}
                  className="rounded-xl border border-brand-red px-4 py-2.5 text-sm font-semibold text-brand-red"
                >
                  Update Password
                </button>
              </div>
            </div>
          </section>
        )}

        {!isLoading && activeTab === 'addresses' && (
          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-bold text-foreground">Saved Addresses</h2>
              <div className="mt-3 space-y-2">
                {addresses.map((address) => (
                  <div key={address.id} className="rounded-lg border border-border bg-background p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {address.label} {address.is_default ? '(Default)' : ''}
                      </p>
                      <div className="flex gap-2">
                        {!address.is_default && (
                          <button onClick={() => setDefaultAddress(address.id)} className="text-xs text-brand-red hover:underline">
                            Set Default
                          </button>
                        )}
                        <button onClick={() => deleteAddress(address.id)} className="text-xs text-destructive hover:underline">
                          Delete
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{address.address_line}</p>
                    <p className="text-xs text-muted-foreground">{address.area || ''} {address.city || ''}</p>
                  </div>
                ))}
                {addresses.length === 0 && <p className="text-sm text-muted-foreground">No saved addresses.</p>}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-bold text-foreground">Add Address</h2>
              <div className="mt-4 space-y-3">
                <input
                  value={addressForm.label}
                  onChange={(event) => setAddressForm((prev) => ({ ...prev, label: event.target.value }))}
                  placeholder="Label (Home, Office)"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                />
                <select
                  value={addressForm.area}
                  onChange={(event) => setAddressForm((prev) => ({ ...prev, area: event.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                >
                  <option value="">Select delivery area</option>
                  {deliveryAreaOptions.map((area) => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
                <textarea
                  rows={3}
                  value={addressForm.address_line}
                  onChange={(event) => setAddressForm((prev) => ({ ...prev, address_line: event.target.value }))}
                  placeholder="Detailed address, house number, floor, landmark"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                />
                <input
                  value={addressForm.city}
                  onChange={(event) => setAddressForm((prev) => ({ ...prev, city: event.target.value }))}
                  placeholder="City"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                />
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={addressForm.is_default}
                    onChange={(event) => setAddressForm((prev) => ({ ...prev, is_default: event.target.checked }))}
                  />
                  Set as default
                </label>
                <button onClick={addAddress} className="rounded-xl bg-brand-red px-4 py-2.5 text-sm font-semibold text-primary-foreground">
                  Add Address
                </button>
              </div>
            </div>
          </section>
        )}

        {!isLoading && activeTab === 'orders' && (
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-bold text-foreground">Order History</h2>
            <div className="mt-4 space-y-3">
              {orders.map((order) => (
                <article key={order.id} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{order.order_number}</p>
                      <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">Rs. {Number(order.total || 0).toLocaleString()}</p>
                      <p className="text-xs uppercase text-muted-foreground">{order.status}</p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg border border-border/80 bg-card/60 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Items in this order</p>
                    {Array.isArray(order.items) && order.items.length > 0 ? (
                      <div className="mt-2 space-y-2">
                        {order.items.map((item, index) => {
                          const itemName = getOrderItemName(item, index)
                          const quantity = Math.max(1, Number(item.quantity || 1))
                          const addOns = getOrderItemAddOns(item)

                          return (
                            <div key={`${order.id}-item-${index}`} className="rounded-md border border-border/60 bg-background px-2.5 py-2">
                              <p className="text-sm text-foreground">
                                <span className="font-semibold">{quantity}x</span> {itemName}
                              </p>
                              {addOns.length > 0 && (
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  Add-ons: {addOns.map((addOn) => addOn.name).join(', ')}
                                </p>
                              )}
                              {item.specialInstructions && (
                                <p className="mt-0.5 text-xs text-muted-foreground">Note: {item.specialInstructions}</p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">No item details available for this order.</p>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {['pending', 'confirmed'].includes(order.status.toLowerCase()) && (
                      <button
                        onClick={() => cancelOrder(order)}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="mr-1 inline h-3.5 w-3.5" />
                        Cancel Order
                      </button>
                    )}
                    <button
                      onClick={() => reorder(order)}
                      className="rounded-lg border border-brand-red px-3 py-1.5 text-xs font-semibold text-brand-red"
                    >
                      Quick Reorder
                    </button>
                    <Link href="/menu" className="rounded-lg border border-border px-3 py-1.5 text-xs text-foreground">
                      Browse Menu
                    </Link>
                  </div>
                </article>
              ))}
              {orders.length === 0 && <p className="text-sm text-muted-foreground">No order history yet.</p>}
            </div>
          </section>
        )}

        {!isLoading && activeTab === 'favorites' && (
          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-bold text-foreground">Your Favorites</h2>
              <div className="mt-3 space-y-2">
                {favoriteItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">Rs. {item.price}</p>
                    </div>
                    <button
                      onClick={() => toggleFavorite(item.id)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs text-foreground hover:bg-muted"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {favoriteItems.length === 0 && <p className="text-sm text-muted-foreground">No favorites saved yet.</p>}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-bold text-foreground">Add Favorites</h2>
              <div className="mt-3 space-y-2 max-h-[420px] overflow-y-auto">
                {menuItems.slice(0, 14).map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">Rs. {item.price}</p>
                    </div>
                    <button
                      onClick={() => toggleFavorite(item.id)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${favoriteIds.has(item.id) ? 'border border-border text-muted-foreground' : 'bg-brand-red text-primary-foreground'}`}
                    >
                      {favoriteIds.has(item.id) ? 'Added' : 'Add'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {!isLoading && activeTab === 'support' && (
          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-bold text-foreground">Submit Query / Complaint / Request</h2>
              <div className="mt-4 space-y-3">
                <select
                  value={supportForm.ticketType}
                  onChange={(event) => setSupportForm((prev) => ({ ...prev, ticketType: event.target.value as TicketType }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                >
                  {ticketTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <input
                  value={supportForm.subject}
                  onChange={(event) => setSupportForm((prev) => ({ ...prev, subject: event.target.value }))}
                  placeholder="Subject"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                />
                <textarea
                  rows={5}
                  value={supportForm.message}
                  onChange={(event) => setSupportForm((prev) => ({ ...prev, message: event.target.value }))}
                  placeholder="Write your message"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                />
                <button onClick={submitSupport} className="rounded-xl bg-brand-red px-4 py-2.5 text-sm font-semibold text-primary-foreground">
                  Submit Ticket
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-bold text-foreground">Admin Replies</h2>
              <div className="mt-3 space-y-3">
                {tickets.map((ticket) => (
                  <article key={ticket.id} className="rounded-xl border border-border bg-background p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-semibold text-foreground">{ticket.subject}</h3>
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                        {ticket.ticket_type}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Submitted: {new Date(ticket.created_at).toLocaleString()}</p>
                    <p className="mt-2 text-sm text-foreground/80">{ticket.message}</p>

                    {ticket.admin_reply ? (
                      <div className="mt-3 rounded-lg border border-brand-red/20 bg-brand-red/5 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-brand-red">Admin Reply</p>
                        <p className="mt-1 text-sm text-foreground">{ticket.admin_reply}</p>
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-muted-foreground">Awaiting admin response.</p>
                    )}
                  </article>
                ))}
                {tickets.length === 0 && <p className="text-sm text-muted-foreground">No tickets yet.</p>}
              </div>
            </div>
          </section>
        )}

        {showSignOutChoice && (
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-brand-dark/60 p-4 backdrop-blur-sm"
            onClick={() => {
              if (!isSigningOut) {
                setShowSignOutChoice(false)
              }
            }}
            role="presentation"
          >
            <div
              className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Choose after sign out"
            >
              <h3 className="text-lg font-bold text-foreground">What would you like to do next?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                You are signing out. Choose to sign in again or continue as guest.
              </p>

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => handleSignOutChoice('signin')}
                  disabled={isSigningOut}
                  className="rounded-xl bg-brand-red px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-brand-red/90 disabled:opacity-60"
                >
                  {isSigningOut ? 'Please wait...' : 'Sign In Again'}
                </button>
                <button
                  type="button"
                  onClick={() => handleSignOutChoice('guest')}
                  disabled={isSigningOut}
                  className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-60"
                >
                  Continue as Guest
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
