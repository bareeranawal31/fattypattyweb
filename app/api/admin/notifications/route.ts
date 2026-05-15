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

    const [ordersResult, ticketsResult, cancellationsResult] = await Promise.all([
      supabase
        .from('orders')
        .select('id, order_number, customer_name, customer_email, order_type, status, created_at')
        .order('created_at', { ascending: false })
        .limit(25),
      supabase
        .from('support_tickets')
        .select('id, customer_id, customer_email, customer_name, subject, ticket_type, status, created_at, reply_at')
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('order_status_history')
        .select('order_id, status, notes, created_at')
        .eq('status', 'cancelled')
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    if (ordersResult.error) throw ordersResult.error
    if (ticketsResult.error) throw ticketsResult.error
    if (cancellationsResult.error) throw cancellationsResult.error

    const notifications = [
      ...(ordersResult.data || [])
        .filter((order) => (order.status || '').toLowerCase() !== 'cancelled')
        .map((order) => ({
        id: `order-${order.id}`,
        type: 'order' as const,
        title: `Order placed ${order.order_number}`,
        message: `${order.customer_name || order.customer_email || 'Customer'} placed a ${order.order_type || 'delivery'} order.`,
        status: order.status || 'pending',
        created_at: order.created_at,
        href: `/admin/orders?order=${order.id}`,
      })),
      ...(cancellationsResult.data || []).map((entry) => ({
        id: `cancelled-${entry.order_id}-${entry.created_at}`,
        type: 'order' as const,
        title: 'Order cancelled',
        message: entry.notes || 'A customer cancelled an order.',
        status: 'cancelled',
        created_at: entry.created_at,
        href: `/admin/orders?order=${entry.order_id}`,
      })),
      ...(ticketsResult.data || []).map((ticket) => ({
        id: `ticket-${ticket.id}`,
        type: 'support' as const,
        title: ticket.ticket_type === 'complaint' ? `Complaint: ${ticket.subject}` : ticket.subject,
        message: `${ticket.customer_name || ticket.customer_email || 'Customer'} sent a ${ticket.ticket_type || 'query'} request (${ticket.status}).`,
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
