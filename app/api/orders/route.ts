import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { checkDeliveryCoverage, findNearestBranch } from '@/lib/location-utils'

interface CartItemForOrder {
  id: string
  type: 'menu_item' | 'deal'
  menuItem?: {
    id: string
    name: string
    price: number
    image?: string
  }
  deal?: {
    id: string
    name: string
    title: string
    price: number
    image?: string
  }
  dealSelections?: Array<{
    group: string
    menuItem: { id: string; name: string }
    quantity: number
  }>
  quantity: number
  customizations?: {
    addOns?: Array<{ id: string; name: string; price: number }>
    specialInstructions?: string
  }
  unitPrice: number
  totalPrice: number
}

interface CreateOrderRequest {
  customerName: string
  customerPhone: string
  customerEmail?: string
  orderType: 'delivery' | 'pickup'
  deliveryArea?: string
  deliveryAddress?: string
  pickupBranch?: string
  selectedBranchId?: string
  deliveryLatitude?: number
  deliveryLongitude?: number
  deliveryFee: number
  discountAmount?: number
  couponCode?: string
  subtotal: number
  total: number
  loyaltyEligibleTotal?: number
  loyaltyPointsRedeemed?: number
  loyaltyEnabled?: boolean
  specialInstructions?: string
  items: Array<CartItemForOrder | Record<string, unknown>>
}

interface BranchDeliveryAreaRow {
  area_name?: string | null
  is_active?: boolean | null
  polygon_coordinates?: unknown
}

interface BranchRowForValidation {
  id: string
  name: string
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  delivery_radius?: number | null
  is_active?: boolean | null
  delivery_areas?: BranchDeliveryAreaRow[] | null
}

const LOYALTY_MIN_ORDER_AMOUNT = 1500
const LOYALTY_FIXED_POINTS = 15

function getMissingColumnName(message: string | undefined): string | null {
  if (!message) {
    return null
  }

  const quotedMatch = message.match(/Could not find the '([^']+)' column/i)
  if (quotedMatch?.[1]) {
    return quotedMatch[1]
  }

  const bareMatch = message.match(/column\s+(?:[a-z_]+\.)?([a-z_][a-z0-9_]*)\s+does not exist/i)
  return bareMatch?.[1] || null
}

async function insertOrderWithFallbacks(
  supabase: SupabaseClient,
  payload: Record<string, unknown>,
) {
  let nextPayload = { ...payload }
  let lastError: { message?: string } | null = null

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const result = await supabase.from('orders').insert(nextPayload).select().single()

    if (!result.error) {
      return { data: result.data, error: null }
    }

    lastError = result.error
    const missingColumn = getMissingColumnName(result.error.message)
    if (!missingColumn || !(missingColumn in nextPayload)) {
      return { data: null, error: result.error }
    }

    const { [missingColumn]: _removed, ...rest } = nextPayload
    nextPayload = rest
  }

  return { data: null, error: lastError }
}

async function insertOrderItemsWithFallbacks(
  supabase: SupabaseClient,
  payload: Array<Record<string, unknown>>,
) {
  let nextPayload = payload.map((row) => ({ ...row }))
  let lastError: { message?: string } | null = null

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const result = await supabase.from('order_items').insert(nextPayload)

    if (!result.error) {
      return null
    }

    lastError = result.error
    const missingColumn = getMissingColumnName(result.error.message)
    if (!missingColumn || !nextPayload.some((row) => missingColumn in row)) {
      return result.error
    }

    nextPayload = nextPayload.map((row) => {
      const { [missingColumn]: _removed, ...rest } = row
      return rest
    })
  }

  return lastError
}

async function upsertUsersRow(
  supabase: SupabaseClient,
  userRow: {
    id: string
    email: string
    name: string | null
    phone: string | null
    loyalty_points?: number
    is_active?: boolean
  },
) {
  const candidates: Array<Record<string, unknown>> = [
    {
      id: userRow.id,
      name: userRow.name,
      email: userRow.email,
      phone: userRow.phone,
      loyalty_points: userRow.loyalty_points ?? 0,
      is_active: userRow.is_active ?? true,
    },
    {
      id: userRow.id,
      name: userRow.name,
      email: userRow.email,
      phone: userRow.phone,
      loyalty_points: userRow.loyalty_points ?? 0,
    },
    {
      id: userRow.id,
      name: userRow.name,
      email: userRow.email,
      phone: userRow.phone,
    },
    {
      id: userRow.id,
      name: userRow.name,
      email: userRow.email,
    },
    {
      id: userRow.id,
      email: userRow.email,
    },
  ]

  let lastError: { message?: string } | null = null

  for (const payload of candidates) {
    const { error } = await supabase.from('users').upsert(payload, { onConflict: 'id' })

    if (!error) {
      return null
    }

    lastError = error
    const isMissingColumn = /Could not find the '.*' column/.test(error.message || '')
    if (!isMissingColumn) {
      break
    }
  }

  return lastError
}

async function resolveRequestUser(request: Request): Promise<User | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    return user
  }

  const authHeader = request.headers.get('authorization') || ''
  const hasBearer = authHeader.toLowerCase().startsWith('bearer ')
  if (!hasBearer) {
    return null
  }

  const token = authHeader.slice(7).trim()
  if (!token) {
    return null
  }

  try {
    const admin = createAdminClient()
    const { data, error } = await admin.auth.getUser(token)
    if (error) {
      console.warn('Order auth token validation failed:', error.message)
      return null
    }
    return data.user || null
  } catch (error) {
    console.warn('Order auth token resolution threw:', error)
    return null
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body: CreateOrderRequest = await request.json()
    const user = await resolveRequestUser(request)
    let dbClient: SupabaseClient = supabase

    try {
      dbClient = createAdminClient()
    } catch (error) {
      console.warn('Order route is using request client because admin client is unavailable:', error)
    }

    console.info('Order create request received', {
      hasAuthorizationHeader: Boolean(request.headers.get('authorization')),
      resolvedUserId: user?.id || null,
      customerEmail: body.customerEmail || null,
      itemsCount: body.items?.length || 0,
      subtotal: body.subtotal || 0,
      total: body.total || 0,
    })

    // Validate required fields
    if (!body.customerName || !body.customerPhone || !body.items?.length) {
      return NextResponse.json(
        { data: null, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!body.customerEmail) {
      return NextResponse.json(
        { data: null, error: 'Email is required' },
        { status: 400 }
      )
    }

    // Delivery orders no longer require map coordinates. Use selectedBranchId if provided.
    if (body.orderType === 'delivery') {
      // If a branch was explicitly selected, prefer it; otherwise leave branch selection to server logic.
      if (body.selectedBranchId) {
        body.pickupBranch = body.pickupBranch || null
      }
    }

    if (user) {
      const userDisplayName =
        (user.user_metadata?.full_name as string | undefined) ||
        body.customerName ||
        null

      const ensureUserError = await upsertUsersRow(dbClient, {
        id: user.id,
        name: userDisplayName,
        email: user.email || body.customerEmail || '',
        phone: body.customerPhone || null,
        loyalty_points: 0,
        is_active: true,
      })

      if (ensureUserError) {
        console.error('Failed to ensure users row before order insert:', ensureUserError)
        return NextResponse.json(
          { data: null, error: 'Could not link order to customer account' },
          { status: 500 },
        )
      }
    }

    // Format items for storage in JSONB
    const itemsJsonb = body.items.map((rawItem) => {
      const item = rawItem as CartItemForOrder & {
        name?: string
        variation?: string
        price?: number
        addOns?: Array<{ id: string; name: string; price: number }>
        specialInstructions?: string
      }

      const itemType = item.type || (item.deal ? 'deal' : 'menu_item')
      const itemName =
        itemType === 'deal'
          ? item.deal?.name || item.name || 'Deal'
          : item.menuItem?.name || item.name || 'Menu Item'

      const title =
        itemType === 'deal'
          ? item.deal?.title || item.variation || null
          : item.variation || null

      const unitPrice = item.unitPrice || item.price || 0

      return {
        id: item.id,
        type: itemType,
        name: itemName,
        title,
        quantity: item.quantity,
        unitPrice,
        totalPrice: item.totalPrice || unitPrice * item.quantity,
        addOns: item.customizations?.addOns || item.addOns || [],
        specialInstructions: item.customizations?.specialInstructions || item.specialInstructions || null,
        dealSelections: item.dealSelections || null,
      }
    })

    // Estimate time based on order type
    const estimatedTime = body.orderType === 'delivery' ? '35-45 minutes' : '15-20 minutes'
    const loyaltyEligibleTotal = body.loyaltyEligibleTotal ?? body.total
    const loyaltyPointsRedeemed = body.loyaltyEnabled === false ? 0 : Math.max(0, body.loyaltyPointsRedeemed || 0)

    if (user && loyaltyPointsRedeemed > 0) {
      const [{ data: profileForValidation }, { data: userRowForValidation }] = await Promise.all([
        supabase
          .from('customer_profiles')
          .select('current_points')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('users')
          .select('loyalty_points')
          .eq('id', user.id)
          .maybeSingle(),
      ])

      const availablePoints = Math.max(
        Number(profileForValidation?.current_points || 0),
        Number(userRowForValidation?.loyalty_points || 0),
      )
      if (loyaltyPointsRedeemed > availablePoints) {
        return NextResponse.json(
          { data: null, error: 'Not enough loyalty points available' },
          { status: 400 },
        )
      }
    }

    const loyaltyPointsEarned =
      user && body.loyaltyEnabled !== false && loyaltyEligibleTotal >= LOYALTY_MIN_ORDER_AMOUNT
        ? LOYALTY_FIXED_POINTS
        : 0

    // Create the order
    const orderInsertPayload = {
      user_id: user?.id || null,
      customer_name: body.customerName,
      customer_email: body.customerEmail,
      customer_phone: body.customerPhone,
      customer_address: body.deliveryAddress || null,
      order_type: body.orderType,
      branch_id: body.selectedBranchId || null,
      delivery_area: body.deliveryArea || null,
      delivery_address: body.deliveryAddress || null,
      delivery_latitude:
        Number.isFinite(body.deliveryLatitude) ? Number(body.deliveryLatitude) : null,
      delivery_longitude:
        Number.isFinite(body.deliveryLongitude) ? Number(body.deliveryLongitude) : null,
      pickup_branch: body.pickupBranch || null,
      items: itemsJsonb,
      subtotal: body.subtotal,
      delivery_fee: body.deliveryFee,
      total: body.total,
      status: 'pending',
      special_instructions:
        body.specialInstructions || (body.couponCode ? `Coupon: ${body.couponCode}` : null),
      notes:
        loyaltyPointsRedeemed > 0
          ? `Loyalty redeemed: ${loyaltyPointsRedeemed} points`
          : null,
      loyalty_points_earned: loyaltyPointsEarned,
      loyalty_points_redeemed: loyaltyPointsRedeemed,
      estimated_time: estimatedTime,
    }

    console.info('Order insert payload', {
      user_id: orderInsertPayload.user_id,
      customer_email: orderInsertPayload.customer_email,
      itemRows: itemsJsonb.length,
      total: orderInsertPayload.total,
      status: orderInsertPayload.status,
    })

    const { data: order, error: orderError } = await insertOrderWithFallbacks(
      dbClient,
      orderInsertPayload,
    )

    if (orderError) {
      console.error('Supabase order error:', orderError)
      throw orderError
    }

    console.info('Order insert response', {
      orderId: order?.id || null,
      orderNumber: order?.order_number || null,
      user_id: order?.user_id || null,
    })

    if (order?.id) {
      const orderItemsPayload = itemsJsonb.map((item) => {
        const rawMenuItemId =
          item.type === 'deal'
            ? (item as { dealSelections?: Array<{ menuItem?: { id?: string } }> }).dealSelections?.[0]?.menuItem?.id
            : item.id

        return {
          order_id: order.id,
          menu_item_id: rawMenuItemId || null,
          quantity: Number(item.quantity) || 1,
          price: Number(item.unitPrice || 0),
          item_name: item.name,
          unit_price: Number(item.unitPrice || 0),
          total_price: Number(item.totalPrice || 0),
          customizations: {
            addOns: item.addOns || [],
            specialInstructions: item.specialInstructions || null,
          },
        }
      })

      if (orderItemsPayload.length > 0) {
        const orderItemsError = await insertOrderItemsWithFallbacks(dbClient, orderItemsPayload)

        if (orderItemsError) {
          console.error('Order items insert failed:', orderItemsError)
        } else {
          console.info('Order items inserted', {
            orderId: order.id,
            count: orderItemsPayload.length,
          })
        }
      }
    }

    if (user) {
      const [{ data: existingProfile }, { data: existingUserRow }] = await Promise.all([
        dbClient
          .from('customer_profiles')
          .select('id,current_points,lifetime_points_earned,total_points_redeemed,email,full_name')
          .eq('id', user.id)
          .maybeSingle(),
        dbClient
          .from('users')
          .select('id,name,email,phone,loyalty_points,is_active')
          .eq('id', user.id)
          .maybeSingle(),
      ])

      const currentPoints = Math.max(
        Number(existingProfile?.current_points || 0),
        Number(existingUserRow?.loyalty_points || 0),
      )
      const lifetimePoints = existingProfile?.lifetime_points_earned || 0
      const redeemedPointsTotal = existingProfile?.total_points_redeemed || 0

      const nextCurrentPoints = Math.max(0, currentPoints + loyaltyPointsEarned - loyaltyPointsRedeemed)

      await dbClient
        .from('customer_profiles')
        .upsert(
          {
            id: user.id,
            email: existingProfile?.email || user.email || body.customerEmail || '',
            full_name:
              existingProfile?.full_name ||
              (user.user_metadata?.full_name as string | undefined) ||
              body.customerName ||
              null,
            current_points: nextCurrentPoints,
            lifetime_points_earned: lifetimePoints + loyaltyPointsEarned,
            total_points_redeemed: redeemedPointsTotal + loyaltyPointsRedeemed,
          },
          { onConflict: 'id' },
        )

      const upsertUserError = await upsertUsersRow(dbClient, {
        id: user.id,
        name:
          (existingUserRow?.name as string | undefined) ||
          (user.user_metadata?.full_name as string | undefined) ||
          body.customerName ||
          null,
        email: (existingUserRow?.email as string | undefined) || user.email || body.customerEmail || '',
        phone: (existingUserRow?.phone as string | undefined) || body.customerPhone || null,
        loyalty_points: nextCurrentPoints,
        is_active: (existingUserRow?.is_active as boolean | undefined) ?? true,
      })

      if (upsertUserError) {
        console.warn('Users table loyalty sync skipped due schema mismatch:', upsertUserError)
      }
    }

    return NextResponse.json({
      data: order,
      error: null,
    })
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      { data: null, error: 'Failed to create order' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const orderNumber = searchParams.get('orderNumber')
    const phone = searchParams.get('phone')

    if (!orderNumber || !phone) {
      return NextResponse.json(
        { data: null, error: 'Order number and phone are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('order_number', orderNumber)
      .eq('customer_phone', phone)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { data: null, error: 'Order not found' },
          { status: 404 }
        )
      }
      throw error
    }

    return NextResponse.json({ data, error: null })
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json(
      { data: null, error: 'Failed to fetch order' },
      { status: 500 }
    )
  }
}
