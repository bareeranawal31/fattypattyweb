import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
    }

    const [{ data: byUserId, error: byUserIdError }, { data: byEmail, error: byEmailError }] = await Promise.all([
      supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      user.email
        ? supabase
            .from('orders')
            .select('*')
            .is('user_id', null)
            .eq('customer_email', user.email)
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

    return NextResponse.json({ data: deduped, error: null })
  } catch (error) {
    console.error('Error loading customer orders:', error)
    return NextResponse.json({ data: [], error: 'Failed to load order history' }, { status: 500 })
  }
}
