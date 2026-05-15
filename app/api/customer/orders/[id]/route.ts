import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface CancelOrderBody {
  reason?: string
}

const cancellableStatuses = new Set(['pending', 'confirmed'])

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as CancelOrderBody
    const reason = body.reason?.trim() || null

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (orderError) {
      throw orderError
    }

    if (!order) {
      return NextResponse.json({ data: null, error: 'Order not found' }, { status: 404 })
    }

    const ownerMatches = order.user_id === user.id || order.customer_email === user.email
    if (!ownerMatches) {
      return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
    }

    const currentStatus = String(order.status || '').toLowerCase()
    if (!cancellableStatuses.has(currentStatus)) {
      return NextResponse.json(
        { data: null, error: 'Only pending or confirmed orders can be cancelled' },
        { status: 400 },
      )
    }

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()

    if (updateError) {
      throw updateError
    }

    await supabase.from('order_status_history').insert({
      order_id: id,
      status: 'cancelled',
      notes: reason || 'Cancelled by customer',
    })

    return NextResponse.json({ data: updatedOrder, error: null })
  } catch (error) {
    console.error('Error cancelling customer order:', error)
    return NextResponse.json({ data: null, error: 'Failed to cancel order' }, { status: 500 })
  }
}
