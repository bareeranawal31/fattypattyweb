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

function getFallbackStats() {
  return {
    todayRevenue: 0,
    todayOrders: 0,
    pendingOrders: 0,
    totalOrders: 0,
    completedToday: 0,
  }
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured, returning fallback stats')
    return NextResponse.json({ data: getFallbackStats(), error: null, _fallback: true }, { status: 200 })
  }

  try {
    const supabase = getSupabase()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayISO = today.toISOString()

    // Get today's orders
    const { data: todayOrders, error: todayError } = await supabase
      .from('orders')
      .select('total, status')
      .gte('created_at', todayISO)

    if (todayError) throw todayError

    // Get pending orders count
    const { count: pendingCount, error: pendingError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'confirmed', 'preparing'])

    if (pendingError) throw pendingError

    // Get total orders
    const { count: totalOrders, error: totalError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })

    if (totalError) throw totalError

    // Calculate stats
    const todayRevenue = todayOrders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0
    const todayOrdersCount = todayOrders?.length || 0
    const completedTodayCount = todayOrders?.filter(o => 
      ['delivered', 'picked_up'].includes(o.status)
    ).length || 0

    return NextResponse.json({
      data: {
        todayRevenue,
        todayOrders: todayOrdersCount,
        pendingOrders: pendingCount || 0,
        totalOrders: totalOrders || 0,
        completedToday: completedTodayCount,
      },
      error: null,
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ data: getFallbackStats(), error: null, _fallback: true }, { status: 200 })
  }
}
