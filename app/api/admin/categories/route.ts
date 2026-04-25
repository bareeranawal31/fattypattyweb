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
      .order('display_order', { ascending: true })

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

    console.log('[v0] Creating category with:', { name, description, display_order })

    if (!name) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    // Check if the categories table exists
    console.log('[v0] Checking if categories table exists...')
    const { error: tableCheckError } = await supabase
      .from('categories')
      .select('id')
      .limit(1)

    if (tableCheckError) {
      console.error('[v0] Table check error:', tableCheckError)
      if (tableCheckError.message?.includes('relation "public.categories" does not exist') ||
          tableCheckError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Categories table does not exist. Please create the table in Supabase SQL Editor with: CREATE TABLE categories (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(100) NOT NULL UNIQUE, description TEXT, display_order INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)' },
          { status: 500 }
        )
      }
    } else {
      console.log('[v0] Categories table exists')
    }

    const insertRow = async () => {
      return await supabase
        .from('categories')
        .insert([{ name, description, display_order }])
        .select()
    }

    const { data, error } = await insertRow()

    console.log('[v0] Insert result:', { data, error })

    if (error) {
      console.error('[v0] Supabase insert error:', error)
      throw error
    }

    const inserted = Array.isArray(data) ? data[0] : data

    console.log('[v0] Category created successfully:', inserted)

    return NextResponse.json({ data: inserted }, { status: 201 })
  } catch (error) {
    console.error('[v0] Error creating category - full details:', {
      error,
      message: error instanceof Error ? error.message : error,
      type: typeof error,
      isError: error instanceof Error,
      stack: error instanceof Error ? error.stack : undefined
    })
    
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
        ? error
        : 'Failed to create category'

    console.error('[v0] Final error message being sent:', message)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
