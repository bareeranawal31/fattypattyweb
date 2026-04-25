import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { deals as hardcodedDeals } from '@/lib/menu-data'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseKey && supabaseUrl.startsWith('http') && supabaseKey.length > 20)
}

function getSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured')
  }
  return createClient(supabaseUrl!, supabaseKey!)
}

function getFallbackDeals() {
  return hardcodedDeals.map((deal) => ({
    id: deal.id,
    name: deal.name,
    description: deal.title,
    items: deal.items,
    deal_type: 'combo',
    fixed_price: deal.price,
    discount_percentage: null,
    is_active: true,
    image_url: deal.image,
    valid_from: new Date().toISOString(),
    valid_until: null,
    created_at: new Date().toISOString(),
  }))
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured, returning fallback deals')
    return NextResponse.json({ data: getFallbackDeals(), error: null, _fallback: true }, { status: 200 })
  }

  try {
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) throw error

    // Transform DB V1 rows to admin UI format
    const transformed = (data || []).map((deal: Record<string, unknown>) => ({
      id: deal.id,
      name: deal.name,
      description: deal.title || deal.name,
      items: (deal.items as string[]) || [],
      deal_type: 'combo',
      fixed_price: deal.price,
      discount_percentage: null,
      is_active: deal.is_active ?? true,
      image_url: deal.image || null,
      valid_from: deal.created_at || new Date().toISOString(),
      valid_until: null,
      created_at: deal.created_at || new Date().toISOString(),
    }))

    // If the table is empty, show hardcoded data so the admin isn't blank
    if (transformed.length === 0) {
      return NextResponse.json({ data: getFallbackDeals(), error: null, _fallback: true }, { status: 200 })
    }

    return NextResponse.json({ data: transformed, error: null }, { status: 200 })
  } catch (error) {
    console.error('[v0] Error fetching deals:', error)
    return NextResponse.json({ data: getFallbackDeals(), error: null, _fallback: true }, { status: 200 })
  }
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { data: null, error: 'Database not configured. Please set up Supabase environment variables.' },
      { status: 503 }
    )
  }

  try {
    const supabase = getSupabase()
    const body = await request.json()
    const {
      name,
      description,
      items,
      fixed_price,
      image_url,
      is_active = true,
    } = body

    if (!name) {
      return NextResponse.json(
        { data: null, error: 'Deal name is required' },
        { status: 400 }
      )
    }

    // Get max sort_order for ordering
    let sortOrder = 1
    try {
      const { data: maxData } = await supabase
        .from('deals')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)
        .single()
      sortOrder = (maxData?.sort_order || 0) + 1
    } catch {
      sortOrder = 1
    }

    // Generate a unique text ID (DB uses text primary key with no default)
    const dealId = `deal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`

    // Insert using V1 DB column names: title, price, image, items
    const { data, error } = await supabase
      .from('deals')
      .insert([
        {
          id: dealId,
          name,
          title: description || name,
          items: Array.isArray(items) ? items : [],
          price: fixed_price || 0,
          image: image_url || '/images/deals.jpg',
          is_active,
          sort_order: sortOrder,
        },
      ])
      .select()
      .single()

    if (error) throw error

    // Transform response to admin UI format
    const transformed = {
      id: data.id,
      name: data.name,
      description: data.title || data.name,
      items: data.items || [],
      deal_type: 'combo',
      fixed_price: data.price,
      discount_percentage: null,
      is_active: data.is_active,
      image_url: data.image || null,
      valid_from: data.created_at || new Date().toISOString(),
      valid_until: null,
      created_at: data.created_at,
    }

    return NextResponse.json({ data: transformed, error: null }, { status: 201 })
  } catch (error) {
    console.error('[v0] Error creating deal:', error)
    const errMsg = error instanceof Error ? error.message : JSON.stringify(error)
    return NextResponse.json(
      { data: null, error: `Failed to create deal: ${errMsg}` },
      { status: 500 }
    )
  }
}
