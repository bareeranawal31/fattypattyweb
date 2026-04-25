import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { categories as hardcodedCategories } from '@/lib/menu-data'

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

function getFallbackCategories() {
  return hardcodedCategories.map((cat, index) => ({
    id: cat.id,
    name: cat.name,
    description: null,
    display_order: index,
    created_at: new Date().toISOString(),
  }))
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured, returning fallback categories')
    return NextResponse.json({ data: getFallbackCategories(), _fallback: true }, { status: 200 })
  }

  try {
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) throw error

    // If the table is empty, show hardcoded data so the admin isn't blank
    if (!data || data.length === 0) {
      return NextResponse.json({ data: getFallbackCategories(), _fallback: true }, { status: 200 })
    }

    return NextResponse.json({ data }, { status: 200 })
  } catch (error) {
    console.error('[v0] Error fetching categories:', error)
    return NextResponse.json({ data: getFallbackCategories(), _fallback: true }, { status: 200 })
  }
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Database not configured. Please set up Supabase environment variables.' },
      { status: 503 }
    )
  }

  try {
    const body = await request.json()
    const { name, description, display_order = 0 } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    // Generate a slug-style text ID (DB uses text primary key)
    const catId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    const { data, error } = await supabase
      .from('categories')
      .insert([{ id: catId, name, description, image: '/images/placeholder.jpg', sort_order: display_order }])
      .select()

    if (error) throw error

    // Supabase returns an array even for single inserts; return the first row to keep
    // the response shape consistent with PATCH and the frontend expectations.
    const inserted = Array.isArray(data) ? data[0] : data

    return NextResponse.json({ data: inserted }, { status: 201 })
  } catch (error) {
    console.error('[v0] Error creating category:', error)
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    )
  }
}
