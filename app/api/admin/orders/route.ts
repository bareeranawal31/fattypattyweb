import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseServiceKey && supabaseUrl.startsWith('http') && supabaseServiceKey.length > 20)
}

function getSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured')
  }
  return createClient(supabaseUrl!, supabaseServiceKey!)
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured, returning empty orders')
    return NextResponse.json({ data: [], count: 0, error: null, _fallback: true }, { status: 200 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = getSupabase()

    const baseSelect = `
      *,
      user:users!orders_user_id_fkey(
        id,
        name,
        email,
        phone
      )
    `

    let query = supabase
      .from('orders')
      .select(baseSelect, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    let orders: unknown[] | null = null
    let count: number | null = 0
    let { error } = await query.then((result) => {
      orders = result.data as unknown[] | null
      count = result.count
      return { error: result.error }
    })

    if (error) {
      console.warn('Admin orders relation query failed, retrying without join:', error.message)

      let fallbackQuery = supabase
        .from('orders')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (status && status !== 'all') {
        fallbackQuery = fallbackQuery.eq('status', status)
      }

      const fallback = await fallbackQuery
      if (fallback.error) throw fallback.error
      orders = fallback.data as unknown[] | null
      count = fallback.count
      error = null
    }

    return NextResponse.json({
      data: orders,
      count,
      error: null,
    })
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json({ data: [], count: 0, error: null, _fallback: true }, { status: 200 })
  }
}
