import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { User } from '@supabase/supabase-js'

function normalizeEmail(email: string | null | undefined): string | null {
  return email?.trim().toLowerCase() || null
}

async function getUserContext(request: Request): Promise<{ user: User | null }> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (!error && user) {
    return { user }
  }

  const authHeader = request.headers.get('authorization') || ''
  const hasBearer = authHeader.toLowerCase().startsWith('bearer ')
  if (!hasBearer) {
    return { user: null }
  }

  const token = authHeader.slice(7).trim()
  if (!token) {
    return { user: null }
  }

  try {
    const admin = createAdminClient()
    const { data, error: tokenError } = await admin.auth.getUser(token)
    if (tokenError) {
      console.warn('Customer orders token validation failed:', tokenError.message)
      return { user: null }
    }
    return { user: data.user || null }
  } catch (tokenResolutionError) {
    console.warn('Customer orders token resolution threw:', tokenResolutionError)
    return { user: null }
  }
}

export async function GET(request: Request) {
  try {
    const { user } = await getUserContext(request)
    if (!user) {
      return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()
    const normalizedEmail = normalizeEmail(user.email)

    const [{ data: byUserId, error: byUserIdError }, { data: byEmail, error: byEmailError }] = await Promise.all([
      supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      normalizedEmail
        ? supabase
            .from('orders')
            .select('*')
            .is('user_id', null)
            .ilike('customer_email', normalizedEmail)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ])

    if (byUserIdError) {
      throw byUserIdError
    }

    if (byEmailError) {
      throw byEmailError
    }

    const deduped = Array.from(
      new Map([...(byUserId || []), ...(byEmail || [])].map((order) => [order.id, order])).values(),
    )
    deduped.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())

    const normalizedOrders = deduped.map((order) => ({
      ...order,
      order_number: order.order_number || String(order.id || ''),
      total: Number(order.total ?? order.total_amount ?? 0),
      items: Array.isArray(order.items) ? order.items : [],
    }))

    return NextResponse.json({ data: normalizedOrders, error: null })
  } catch (error) {
    console.error('Error loading customer orders:', error)
    return NextResponse.json({ data: [], error: 'Failed to load order history' }, { status: 500 })
  }
}
