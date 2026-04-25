import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import {
  categories as hardcodedCategories,
  menuItems as hardcodedMenuItems,
  deals as hardcodedDeals,
} from '@/lib/menu-data'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function isSupabaseConfigured(): boolean {
  return !!(
    supabaseUrl &&
    supabaseServiceKey &&
    supabaseUrl.startsWith('http') &&
    supabaseServiceKey.length > 20
  )
}

function getSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured')
  }
  return createClient(supabaseUrl!, supabaseServiceKey!)
}

// Convert hardcoded data to admin-compatible format
function getFallbackData() {
  const categories = hardcodedCategories.map((cat, i) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.id,
    is_active: true,
    display_order: i,
    image_url: cat.image,
  }))

  const items = hardcodedMenuItems.map((item, i) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    price: item.price,
    image_url: item.image,
    is_available: true,
    category_id: item.category,
    display_order: i,
    category: { name: hardcodedCategories.find(c => c.id === item.category)?.name || item.category },
  }))

  const deals = hardcodedDeals.map((deal) => ({
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

  return { categories, items, deals }
}

interface CreateMenuItemRequest {
  name: string
  description?: string
  price: number
  category_id: string
  image_url?: string
  is_available?: boolean
}

export async function GET() {
  // If Supabase is not configured, return fallback data
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured, using fallback menu data')
    const fallback = getFallbackData()
    return NextResponse.json({
      data: fallback,
      error: null,
      _fallback: true,
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  }

  try {
    const supabase = getSupabase()

    // Try display_order first (Schema V2), fall back to sort_order (Schema V1), then name
    const [categoriesResult, itemsResult, dealsResult] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order', { ascending: true }),
      supabase.from('menu_items').select('*, category:categories(name)').order('sort_order', { ascending: true }),
      supabase.from('deals').select('*').order('sort_order', { ascending: true }),
    ])

    if (categoriesResult.error) {
      console.error('Categories fetch error:', categoriesResult.error)
      throw categoriesResult.error
    }
    if (itemsResult.error) {
      console.error('Items fetch error:', itemsResult.error)
      throw itemsResult.error
    }
    if (dealsResult.error) {
      console.error('Deals fetch error:', dealsResult.error)
      throw dealsResult.error
    }

    // Transform DB V1 rows to admin UI V2 format
    const categories = (categoriesResult.data || []).map((cat: Record<string, unknown>) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.id,
      is_active: cat.is_active ?? true,
      display_order: cat.sort_order ?? 0,
      image_url: cat.image || null,
    }))

    const items = (itemsResult.data || []).map((item: Record<string, unknown>) => ({
      id: item.id,
      name: item.name,
      description: item.description || null,
      price: item.price,
      image_url: item.image || null,
      is_available: item.is_available ?? true,
      category_id: item.category_id,
      display_order: item.sort_order ?? 0,
      category: item.category || null,
    }))

    const deals = (dealsResult.data || []).map((deal: Record<string, unknown>) => ({
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

    // If all tables are empty, fall back to hardcoded data so admin isn't blank
    if (categories.length === 0 && items.length === 0) {
      const fallback = getFallbackData()
      return NextResponse.json({ data: fallback, error: null, _fallback: true }, {
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0' },
      })
    }

    return NextResponse.json({
      data: { categories, items, deals },
      error: null,
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error) {
    console.error('Error fetching menu from Supabase:', error)
    // Fall back to hardcoded data on any Supabase error
    console.warn('Falling back to hardcoded menu data')
    const fallback = getFallbackData()
    return NextResponse.json({
      data: fallback,
      error: null,
      _fallback: true,
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabase()
    const body: CreateMenuItemRequest = await request.json()

    // Validate required fields
    if (!body.name || !body.price || !body.category_id) {
      return NextResponse.json(
        { data: null, error: 'Missing required fields: name, price, category_id' },
        { status: 400 }
      )
    }

    // Try to get max sort_order, fall back to sort_order (Schema V1), then name
    let displayOrder = 1
    try {
      const { data: maxOrderData } = await supabase
        .from('menu_items')
        .select('sort_order')
        .eq('category_id', body.category_id)
        .order('sort_order', { ascending: false })
        .limit(1)
        .single()
      displayOrder = (maxOrderData?.sort_order || 0) + 1
    } catch {
      displayOrder = 1
    }

    // Generate a unique text ID (DB uses text primary key with no default)
    const itemId = `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`

    const { data, error } = await supabase
      .from('menu_items')
      .insert({
        id: itemId,
        name: body.name,
        description: body.description || null,
        price: body.price,
        category_id: body.category_id,
        image: body.image_url || '/images/placeholder.jpg',
        is_available: body.is_available ?? true,
        sort_order: displayOrder,
      })
      .select('*, category:categories(name)')
      .single()

    if (error) throw error

    // Transform to admin UI format
    const transformed = {
      id: data.id,
      name: data.name,
      description: data.description,
      price: data.price,
      image_url: data.image || null,
      is_available: data.is_available,
      category_id: data.category_id,
      display_order: data.sort_order || 0,
      category: data.category || null,
    }

    return NextResponse.json({ data: transformed, error: null })
  } catch (error) {
    console.error('Error creating menu item:', error)
    return NextResponse.json(
      { data: null, error: 'Failed to create menu item' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = getSupabase()
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { data: null, error: 'Missing item id' },
        { status: 400 }
      )
    }

    // Translate V2 UI field names to V1 DB column names
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (updateData.name !== undefined) updatePayload.name = updateData.name
    if (updateData.description !== undefined) updatePayload.description = updateData.description
    if (updateData.price !== undefined) updatePayload.price = updateData.price
    if (updateData.category_id !== undefined) updatePayload.category_id = updateData.category_id
    if (updateData.is_available !== undefined) updatePayload.is_available = updateData.is_available
    if (updateData.image_url !== undefined) updatePayload.image = updateData.image_url
    if (updateData.display_order !== undefined) updatePayload.sort_order = updateData.display_order

    const { data, error } = await supabase
      .from('menu_items')
      .update(updatePayload)
      .eq('id', id)
      .select('*, category:categories(name)')
      .single()

    if (error) throw error

    // Transform to admin UI format
    const transformed = {
      id: data.id,
      name: data.name,
      description: data.description,
      price: data.price,
      image_url: data.image || null,
      is_available: data.is_available,
      category_id: data.category_id,
      display_order: data.sort_order || 0,
      category: data.category || null,
    }

    return NextResponse.json({ data: transformed, error: null })
  } catch (error) {
    console.error('Error updating menu item:', error)
    return NextResponse.json(
      { data: null, error: 'Failed to update menu item' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = getSupabase()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { data: null, error: 'Missing item id' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ data: { id }, error: null })
  } catch (error) {
    console.error('Error deleting menu item:', error)
    return NextResponse.json(
      { data: null, error: 'Failed to delete menu item' },
      { status: 500 }
    )
  }
}
