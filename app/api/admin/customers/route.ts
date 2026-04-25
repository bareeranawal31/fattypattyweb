import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const LOYALTY_MIN_ORDER_AMOUNT = 1500
const LOYALTY_FIXED_POINTS = 15

interface PublicCustomerRow {
  id: string
  name: string | null
  email: string
  phone: string | null
  loyalty_points: number
  is_active: boolean
  created_at: string
}

interface ProfileRow {
  id: string
  email: string
  full_name: string | null
  current_points: number
  created_at?: string
}

interface AuthListUser {
  id: string
  email?: string
  created_at?: string
  user_metadata?: {
    full_name?: string
    phone?: string
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = (searchParams.get('search') || '').trim().toLowerCase()
    const status = searchParams.get('status') || 'all'

    let supabase
    try {
      supabase = createAdminClient()
    } catch (error) {
      console.error('Admin customers client initialization failed:', error)
      return NextResponse.json({ data: [], error: null })
    }

    let customers: PublicCustomerRow[] = []
    let profiles: ProfileRow[] = []

    let authUsers: AuthListUser[] = []
    try {
      const { data, error } = await supabase.auth.admin.listUsers()
      if (error) {
        console.warn('Admin auth user listing failed, continuing with public tables only:', error.message)
      } else {
        authUsers = (data?.users || []) as AuthListUser[]
      }
    } catch (error) {
      console.warn('Admin auth user listing threw, continuing with public tables only:', error)
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.warn('Users table query failed, continuing without users rows:', error.message)
      } else {
        customers = (data || []) as PublicCustomerRow[]
      }
    } catch (error) {
      console.warn('Users table query threw, continuing without users rows:', error)
    }

    try {
      const { data, error } = await supabase
        .from('customer_profiles')
        .select('id,email,full_name,current_points,created_at')

      if (error) {
        console.warn('customer_profiles query failed, continuing without profile rows:', error.message)
      } else {
        profiles = (data || []) as ProfileRow[]
      }
    } catch (error) {
      console.warn('customer_profiles query threw, continuing without profile rows:', error)
    }

    const publicUsersById = new Map(customers.map((customer) => [customer.id, customer]))
    const profilesById = new Map(profiles.map((profile) => [profile.id, profile]))

    const customerIds = Array.from(
      new Set([
        ...authUsers.map((user) => user.id),
        ...customers.map((customer) => customer.id),
        ...profiles.map((profile) => profile.id),
      ]),
    )

    const statsByCustomer = new Map<string, { totalOrders: number; totalSpent: number }>()
    const loyaltyByCustomer = new Map<string, number>()

    if (customerIds.length > 0) {
      try {
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('*')

        if (ordersError) {
          console.warn('Customer order stats query failed, continuing without order aggregates:', ordersError.message)
        }

        const allOrders = (orders || []) as Array<Record<string, unknown>>

        customerIds.forEach((id) => {
          const publicUser = publicUsersById.get(id)
          const profile = profilesById.get(id)
          const authUser = authUsers.find((user) => user.id === id)
          const email = (publicUser?.email || profile?.email || authUser?.email || '').trim().toLowerCase()

          const idMatchedOrders = allOrders.filter((order) => {
            const orderCustomerId = typeof order.customer_id === 'string' ? order.customer_id : ''
            const orderUserId = typeof order.user_id === 'string' ? order.user_id : ''
            return orderCustomerId === id || orderUserId === id
          })

          const emailMatchedOrders = allOrders.filter((order) => {
            const orderEmail = typeof order.customer_email === 'string' ? order.customer_email.trim().toLowerCase() : ''
            return !!email && orderEmail === email
          })

          const matchedOrders = Array.from(
            new Map(
              [...idMatchedOrders, ...emailMatchedOrders].map((order) => [
                String(order.id || order.order_number || Math.random()),
                order,
              ]),
            ).values(),
          )

          const derivedPoints = matchedOrders.reduce((sum, order) => {
            const total = Number(order.total || 0)
            return sum + (total >= LOYALTY_MIN_ORDER_AMOUNT ? LOYALTY_FIXED_POINTS : 0)
          }, 0)

          statsByCustomer.set(id, {
            totalOrders: matchedOrders.length,
            totalSpent: matchedOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0),
          })
          loyaltyByCustomer.set(id, Math.max(0, derivedPoints))
        })
      } catch (error) {
        console.warn('Orders query threw, continuing without order aggregates:', error)
      }
    }

    let rows = customerIds.map((id) => {
      const authUser = authUsers.find((user) => user.id === id)
      const publicUser = publicUsersById.get(id)
      const profile = profilesById.get(id)

      return {
        id,
        name: publicUser?.name || profile?.full_name || authUser?.user_metadata?.full_name || null,
        email: publicUser?.email || profile?.email || authUser?.email || '',
        phone: publicUser?.phone || authUser?.user_metadata?.phone || null,
        loyalty_points: Math.max(
          Number(publicUser?.loyalty_points || 0),
          Number(profile?.current_points || 0),
          Number(loyaltyByCustomer.get(id) || 0),
        ),
        is_active: publicUser?.is_active ?? true,
        created_at: publicUser?.created_at || profile?.created_at || authUser?.created_at || new Date(0).toISOString(),
      }
    }).filter((row) => row.email)

    if (status !== 'all') {
      const active = status === 'active'
      rows = rows.filter((row) => row.is_active === active)
    }

    if (search) {
      rows = rows.filter((row) => {
        const haystack = `${row.name || ''} ${row.email || ''} ${row.phone || ''}`.toLowerCase()
        return haystack.includes(search)
      })
    }

    const data = rows.map((row) => {
      const stats = statsByCustomer.get(row.id) || { totalOrders: 0, totalSpent: 0 }
      return {
        ...row,
        total_orders: stats.totalOrders,
        total_spent: stats.totalSpent,
      }
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return NextResponse.json({ data, error: null })
  } catch (error) {
    console.error('Error fetching admin customers:', error)
    return NextResponse.json({ data: [], error: null })
  }
}
