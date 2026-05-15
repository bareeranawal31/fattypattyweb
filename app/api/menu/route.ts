import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import {
  categories as hardcodedCategories,
  menuItems as hardcodedMenuItems,
  deals as hardcodedDeals,
} from '@/lib/menu-data'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const DNS_BACKOFF_MS = 5 * 60 * 1000

let dnsFailureUntil = 0
let lastDnsLogAt = 0

function isSupabaseConfigured(): boolean {
  return !!(
    supabaseUrl &&
    supabaseServiceKey &&
    supabaseUrl.startsWith('http') &&
    supabaseServiceKey.length > 20
  )
}

function getSupabase() {
  return createClient(supabaseUrl!, supabaseServiceKey!)
}

function isDnsFailure(error: unknown): boolean {
  const message = String((error as { message?: string })?.message || error || '')
  const details = String((error as { details?: string })?.details || '')
  return /ENOTFOUND|getaddrinfo/i.test(`${message}\n${details}`)
}

function markDnsFailure(error: unknown) {
  if (!isDnsFailure(error)) return

  dnsFailureUntil = Date.now() + DNS_BACKOFF_MS
  const now = Date.now()
  if (now - lastDnsLogAt > 60_000) {
    lastDnsLogAt = now
    console.warn('[menu API] Supabase DNS lookup failed. Using fallback data for 5 minutes.')
  }
}

function shouldUseDnsFallback() {
  return Date.now() < dnsFailureUntil
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
    rating: item.rating,
    is_popular: item.popular || false,
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
  return { categories, items, deals, addOns: [], drinkOptions: [] }
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    console.warn('[menu API] Supabase not configured, using fallback')
    return NextResponse.json({ data: getFallbackData(), error: null }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  }

  if (shouldUseDnsFallback()) {
    return NextResponse.json({ data: getFallbackData(), error: null, _fallback: true }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  }

  try {
    const supabase = getSupabase()

    // Fetch all menu data in parallel — using V1 schema columns
    const [categoriesResult, itemsResult, dealsResult, addOnsResult, drinkOptionsResult] =
      await Promise.all([
        supabase
          .from('categories')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true }),
        supabase
          .from('menu_items')
          .select('*, category:categories(id, name)')
          .eq('is_available', true)
          .order('sort_order'),
        supabase
          .from('deals')
          .select('*')
          .eq('is_active', true)
          .order('sort_order'),
        supabase
          .from('add_ons')
          .select('*')
          .eq('is_active', true),
        supabase
          .from('drink_options')
          .select('*')
          .eq('is_active', true),
      ])

    if (categoriesResult.error) throw categoriesResult.error
    if (itemsResult.error) throw itemsResult.error
    if (dealsResult.error) throw dealsResult.error
    // add_ons and drink_options may not have data — don't throw on error
    const addOns = addOnsResult.data || []
    const drinkOptions = drinkOptionsResult.data || []

    // Transform V1 DB rows: add image_url alias for frontend compatibility
    const items = (itemsResult.data || []).map((item: Record<string, unknown>) => ({
      ...item,
      image_url: item.image || null,
    }))

    const deals = (dealsResult.data || []).map((deal: Record<string, unknown>) => ({
      ...deal,
      image_url: deal.image || null,
    }))

    const categories = [...(categoriesResult.data || [])].sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
      const aOrder = Number(a.display_order ?? a.sort_order ?? 0)
      const bOrder = Number(b.display_order ?? b.sort_order ?? 0)
      return aOrder - bOrder
    })

    return NextResponse.json({
      data: {
        categories,
        items,
        deals,
        addOns,
        drinkOptions,
      },
      error: null,
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error) {
    markDnsFailure(error)
    if (!isDnsFailure(error)) {
      console.error('Error fetching menu:', error)
    }
    // Fallback to hardcoded data
    return NextResponse.json({ data: getFallbackData(), error: null }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  }
}
