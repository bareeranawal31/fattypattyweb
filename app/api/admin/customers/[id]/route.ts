import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const LOYALTY_MIN_ORDER_AMOUNT = 1500
const LOYALTY_FIXED_POINTS = 15

interface UpdateCustomerBody {
  name?: string
  phone?: string
  is_active?: boolean
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    let supabase
    try {
      supabase = createAdminClient()
    } catch (error) {
      console.error('Admin customer detail client initialization failed:', error)
      return NextResponse.json({
        data: {
          id,
          name: null,
          email: '',
          phone: null,
          loyalty_points: 0,
          is_active: true,
          created_at: new Date(0).toISOString(),
          total_orders: 0,
          total_spent: 0,
          orders: [],
        },
        error: null,
      })
    }

    let authCustomer: { user?: { email?: string; created_at?: string; user_metadata?: { full_name?: string; phone?: string } } } | null = null
    let customer: Record<string, unknown> | null = null
    let profile: Record<string, unknown> | null = null
    let idMatchedOrders: Array<Record<string, unknown>> = []
    let emailMatchedOrders: Array<Record<string, unknown>> = []

    try {
      const { data, error } = await supabase.auth.admin.getUserById(id)
      if (error) {
        console.warn('Admin auth user detail failed, continuing with table data only:', error.message)
      } else {
        authCustomer = data
      }
    } catch (error) {
      console.warn('Admin auth user detail threw, continuing with table data only:', error)
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (error) {
        console.warn('Users customer detail query failed:', error.message)
      } else {
        customer = data
      }
    } catch (error) {
      console.warn('Users customer detail query threw:', error)
    }

    try {
      const { data, error } = await supabase
        .from('customer_profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (error) {
        console.warn('Customer profile detail query failed:', error.message)
      } else {
        profile = data
      }
    } catch (error) {
      console.warn('Customer profile detail query threw:', error)
    }

    const authUser = authCustomer?.user
    const resolvedEmail =
      (typeof customer?.email === 'string' && customer.email) ||
      (typeof profile?.email === 'string' && profile.email) ||
      authUser?.email ||
      ''
    const resolvedPhone =
      (typeof customer?.phone === 'string' && customer.phone) ||
      authUser?.user_metadata?.phone ||
      null

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', id)
        .order('created_at', { ascending: false })

      if (error) {
        console.warn('Customer detail user_id orders query failed, continuing with email fallback only:', error.message)
      } else {
        idMatchedOrders = (data || []) as Array<Record<string, unknown>>
      }
    } catch (error) {
      console.warn('Customer detail user_id orders query threw, continuing with email fallback only:', error)
    }

    const normalizedEmail = resolvedEmail.trim().toLowerCase()
    if (normalizedEmail) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .ilike('customer_email', normalizedEmail)
          .order('created_at', { ascending: false })

        if (error) {
          console.warn('Customer detail email fallback query failed:', error.message)
        } else {
          emailMatchedOrders = ((data || []) as Array<Record<string, unknown>>).filter((order) => {
            const orderUserId = typeof order.user_id === 'string' ? order.user_id : ''
            return !orderUserId || orderUserId === id
          })
        }
      } catch (error) {
        console.warn('Customer detail email fallback query threw:', error)
      }
    }

    const matchedOrders = Array.from(
      new Map(
        [...idMatchedOrders, ...emailMatchedOrders]
          .sort((a, b) => new Date(String(b.created_at || '')).getTime() - new Date(String(a.created_at || '')).getTime())
          .map((order) => [String(order.id || order.order_number || Math.random()), order]),
      ).values(),
    )

    const totalOrders = matchedOrders.length
    const totalSpent = matchedOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0)
    const derivedLoyaltyPoints = matchedOrders.reduce((sum, order) => {
      const total = Number(order.total || 0)
      return sum + (total >= LOYALTY_MIN_ORDER_AMOUNT ? LOYALTY_FIXED_POINTS : 0)
    }, 0)

    return NextResponse.json({
      data: {
        id,
        name:
          (typeof customer?.name === 'string' && customer.name) ||
          (typeof profile?.full_name === 'string' && profile.full_name) ||
          authUser?.user_metadata?.full_name ||
          null,
        email: resolvedEmail,
        phone:
          resolvedPhone,
        loyalty_points: Math.max(
          Number(customer?.loyalty_points || 0),
          Number(profile?.current_points || 0),
          Math.max(0, derivedLoyaltyPoints),
        ),
        is_active: typeof customer?.is_active === 'boolean' ? customer.is_active : true,
        created_at:
          (typeof customer?.created_at === 'string' && customer.created_at) ||
          (typeof profile?.created_at === 'string' && profile.created_at) ||
          authUser?.created_at ||
          new Date(0).toISOString(),
        total_orders: totalOrders,
        total_spent: totalSpent,
        orders: matchedOrders,
      },
      error: null,
    })
  } catch (error) {
    console.error('Error fetching customer detail:', error)
    return NextResponse.json({
      data: {
        id: '',
        name: null,
        email: '',
        phone: null,
        loyalty_points: 0,
        is_active: true,
        created_at: new Date(0).toISOString(),
        total_orders: 0,
        total_spent: 0,
        orders: [],
      },
      error: null,
    })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = (await request.json()) as UpdateCustomerBody
    const supabase = createAdminClient()

    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    const updatePayload: Record<string, unknown> = {
      id,
      email: existingUser?.email || '',
    }
    if (body.name !== undefined) updatePayload.name = body.name.trim() || null
    if (body.phone !== undefined) updatePayload.phone = body.phone.trim() || null
    if (body.is_active !== undefined) updatePayload.is_active = Boolean(body.is_active)

    const { data, error } = await supabase
      .from('users')
      .upsert(updatePayload, { onConflict: 'id' })
      .select('*')
      .single()

    if (error) throw error

    await supabase.auth.admin.updateUserById(id, {
      user_metadata: {
        full_name: body.name ?? data.name ?? null,
        phone: body.phone ?? data.phone ?? null,
      },
    })

    return NextResponse.json({ data, error: null })
  } catch (error) {
    console.error('Error updating customer:', error)
    return NextResponse.json({ data: null, error: 'Failed to update customer' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

    const { error: deleteProfileError } = await supabase
      .from('users')
      .delete()
      .eq('id', id)

    if (deleteProfileError) throw deleteProfileError

    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(id)
    if (deleteAuthError) throw deleteAuthError

    return NextResponse.json({ data: { id }, error: null })
  } catch (error) {
    console.error('Error deleting customer:', error)
    return NextResponse.json({ data: null, error: 'Failed to delete customer' }, { status: 500 })
  }
}
