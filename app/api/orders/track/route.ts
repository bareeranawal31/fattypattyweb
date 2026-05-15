import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

interface CancelOrderBody {
  orderNumber?: string
  phone?: string
  reason?: string
}

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const orderNumber = searchParams.get('orderNumber')
    const phone = searchParams.get('phone')

    if (!orderNumber || !phone) {
      return NextResponse.json(
        { data: null, error: 'Order number and phone are required' },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    // Keep only digits so +92 / 03xx formats can still match.
    const cleanPhone = phone.replace(/\D/g, '')

    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('order_number', orderNumber.toUpperCase())
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

    // Verify phone number matches (clean both for comparison)
    const orderPhone = (order.customer_phone || '').replace(/\D/g, '')
    if (!orderPhone.includes(cleanPhone) && !cleanPhone.includes(orderPhone)) {
      return NextResponse.json(
        { data: null, error: 'Phone number does not match order' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      data: order,
      error: null,
    })
  } catch (error) {
    console.error('Error tracking order:', error)
    return NextResponse.json(
      { data: null, error: 'Failed to track order' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as CancelOrderBody
    const orderNumber = body.orderNumber?.trim()
    const phone = body.phone?.trim()

    if (!orderNumber || !phone) {
      return NextResponse.json(
        { data: null, error: 'Order number and phone are required' },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    const cleanPhone = phone.replace(/\D/g, '')

    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('order_number', orderNumber.toUpperCase())
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

    const orderPhone = (order.customer_phone || '').replace(/\D/g, '')
    if (!orderPhone.includes(cleanPhone) && !cleanPhone.includes(orderPhone)) {
      return NextResponse.json(
        { data: null, error: 'Phone number does not match order' },
        { status: 403 }
      )
    }

    const currentStatus = String(order.status || '').toLowerCase()
    if (currentStatus !== 'pending') {
      return NextResponse.json(
        { data: null, error: 'Only pending orders can be cancelled from tracking' },
        { status: 400 }
      )
    }

    const notes = body.reason?.trim() || 'Cancelled from tracking page'

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .select('*')
      .single()

    if (updateError) {
      throw updateError
    }

    await supabase.from('order_status_history').insert({
      order_id: order.id,
      status: 'cancelled',
      notes,
    })

    return NextResponse.json({
      data: updatedOrder,
      error: null,
    })
  } catch (error) {
    console.error('Error cancelling tracked order:', error)
    return NextResponse.json(
      { data: null, error: 'Failed to cancel order' },
      { status: 500 }
    )
  }
}
