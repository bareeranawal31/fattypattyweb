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
    throw new Error('Supabase not configured')
  }
  return createClient(supabaseUrl!, supabaseServiceKey!)
}

function getFallbackData() {
  const categories = hardcodedCategories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    image: cat.image,
    display_order: 0,
    is_active: true,
  }))
  const items = hardcodedMenuItems.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    price: item.price,
    image: item.image,
    image_url: item.image,
    is_available: true,
    category_id: item.category,
    category: { id: item.category, name: hardcodedCategories.find(c => c.id === item.category)?.name || item.category },
    sort_order: 0,
  }))
  const deals = hardcodedDeals.map((deal) => ({
    id: deal.id,
    name: deal.name,
    title: deal.title,
    items: deal.items,
    price: deal.price,
    image: deal.image,
    image_url: deal.image,
    is_active: true,
  }))
  return { categories, items, deals }
}

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ ok: true, supabase: false, data: getFallbackData() }, { status: 200 })
    }

    const supabase = getSupabase()

    const [categoriesResult, itemsResult, dealsResult] = await Promise.all([
      supabase.from('categories').select('*').order('display_order', { ascending: true }),
      supabase.from('menu_items').select('*, category:categories(id, name)').eq('is_available', true).order('sort_order'),
      supabase.from('deals').select('*').eq('is_active', true).order('sort_order'),
    ])

    const categories = categoriesResult.error ? [] : (categoriesResult.data || [])
    const items = itemsResult.error ? [] : (itemsResult.data || [])
    const deals = dealsResult.error ? [] : (dealsResult.data || [])

    return NextResponse.json({ ok: true, supabase: true, categories, items, deals }, { status: 200 })
  } catch (error) {
    console.error('[debug] Error fetching debug categories:', error)
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
  }
}
