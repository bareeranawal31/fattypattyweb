import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function getSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

export async function GET() {
  try {
    const supabase = getSupabase()

    const [cancellationsResult, ticketsResult] = await Promise.all([
      supabase
        .from('order_status_history')
        .select('order_id, status, notes, created_at')
        .eq('status', 'cancelled')
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('support_tickets')
        .select('id, customer_id, customer_email, customer_name, subject, ticket_type, status, created_at, reply_at')
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    if (cancellationsResult.error) throw cancellationsResult.error
    if (ticketsResult.error) throw ticketsResult.error

    const cancelledOrderIds = Array.from(
      new Set((cancellationsResult.data || []).map((entry) => String(entry.order_id)).filter(Boolean)),
    )

    const ordersById = new Map<string, { id: string; order_number: string; customer_name: string | null; customer_email: string | null; order_type: string | null }>()

    if (cancelledOrderIds.length > 0) {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, order_number, customer_name, customer_email, order_type')
        .in('id', cancelledOrderIds)

      if (ordersError) throw ordersError

      ;(ordersData || []).forEach((order) => {
        ordersById.set(String(order.id), {
          id: String(order.id),
          order_number: order.order_number,
          customer_name: order.customer_name,
          customer_email: order.customer_email,
          order_type: order.order_type,
        })
      })
    }

    const notifications = [
      ...(cancellationsResult.data || []).map((entry) => {
        const order = ordersById.get(String(entry.order_id))
        return {
          id: `cancelled-${entry.order_id}-${entry.created_at}`,
          type: 'order' as const,
          title: order?.order_number ? `Order cancelled ${order.order_number}` : 'Order cancelled',
          message: order
            ? `${order.customer_name || order.customer_email || 'Customer'} cancelled this ${order.order_type || 'order'}.`
            : 'A customer cancelled an order.',
          status: 'cancelled',
          created_at: entry.created_at,
          href: order?.id ? `/admin/orders?order=${order.id}` : '/admin/orders?status=cancelled',
        }
      }),
      ...(ticketsResult.data || []).map((ticket) => ({
        id: `ticket-${ticket.id}`,
        type: 'support' as const,
        title: ticket.subject,
        message: `${ticket.customer_name || ticket.customer_email || 'Customer'} sent a ${ticket.ticket_type} request (${ticket.status}).`,
        status: ticket.status,
        created_at: ticket.created_at,
        href: '/admin/support',
      })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return NextResponse.json({ data: notifications, error: null })
  } catch (error) {
    console.error('Error fetching admin notifications:', error)
    return NextResponse.json({ data: [], error: 'Failed to fetch notifications' }, { status: 500 })
  }
}
