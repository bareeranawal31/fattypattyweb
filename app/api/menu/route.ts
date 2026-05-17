import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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

export async function GET() {
  if (!isSupabaseConfigured()) {
    console.warn('[menu API] Supabase not configured')
    return NextResponse.json({ data: { categories: [], items: [], deals: [], addOns: [], drinkOptions: [] }, error: 'Supabase is not configured' }, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  }

  if (shouldUseDnsFallback()) {
    return NextResponse.json({ data: { categories: [], items: [], deals: [], addOns: [], drinkOptions: [] }, error: 'Temporary DNS issue while loading menu data' }, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  }

  try {
    const supabase = getSupabase()

    const [categoriesResult, itemsResult, dealsResult, addOnsResult, drinkOptionsResult] = await Promise.allSettled([
      supabase
        .from('categories')
        .select('*')
        .eq('is_active', true),
      supabase
        .from('menu_items')
        .select('*, category:categories(id, name)')
        .eq('is_available', true),
      supabase
        .from('deals')
        .select('*')
        .eq('is_active', true),
      supabase
        .from('add_ons')
        .select('*')
        .eq('is_active', true),
      supabase
        .from('drink_options')
        .select('*')
        .eq('is_active', true),
    ])

    const categoriesQuery = categoriesResult.status === 'fulfilled' ? categoriesResult.value : null
    const itemsQuery = itemsResult.status === 'fulfilled' ? itemsResult.value : null
    const dealsQuery = dealsResult.status === 'fulfilled' ? dealsResult.value : null
    const addOnsQuery = addOnsResult.status === 'fulfilled' ? addOnsResult.value : null
    const drinkOptionsQuery = drinkOptionsResult.status === 'fulfilled' ? drinkOptionsResult.value : null

    if (categoriesQuery?.error) {
      console.error('[menu API] Failed to fetch categories:', categoriesQuery.error)
    }
    if (itemsQuery?.error) {
      console.error('[menu API] Failed to fetch menu items:', itemsQuery.error)
      throw itemsQuery.error
    }
    if (dealsQuery?.error) {
      console.error('[menu API] Failed to fetch deals:', dealsQuery.error)
    }

    const addOns = addOnsQuery?.error ? [] : (addOnsQuery?.data || [])
    const drinkOptions = drinkOptionsQuery?.error ? [] : (drinkOptionsQuery?.data || [])

    // Transform V1 DB rows: add image_url alias for frontend compatibility
    const items = ((itemsQuery?.data as Array<Record<string, unknown>> | null) || [])
      .map((item: Record<string, unknown>) => ({
        ...item,
        image_url: item.image || null,
      }))
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
        const aOrder = Number(a.sort_order ?? a.display_order ?? 0)
        const bOrder = Number(b.sort_order ?? b.display_order ?? 0)
        return aOrder - bOrder
      })

    const deals = ((dealsQuery?.data as Array<Record<string, unknown>> | null) || [])
      .map((deal: Record<string, unknown>) => ({
        ...deal,
        image_url: deal.image || null,
      }))
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
        const aOrder = Number(a.sort_order ?? a.display_order ?? 0)
        const bOrder = Number(b.sort_order ?? b.display_order ?? 0)
        return aOrder - bOrder
      })

    const categories = [...(((categoriesQuery?.data as Array<Record<string, unknown>> | null) || []))].sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
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
    return NextResponse.json({ data: { categories: [], items: [], deals: [], addOns: [], drinkOptions: [] }, error: 'Failed to load menu data' }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  }
}
