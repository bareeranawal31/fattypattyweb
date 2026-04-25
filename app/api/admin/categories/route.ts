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

function getMissingColumnName(message: string | undefined): string | null {
  if (!message) {
    return null
  }

  const quotedMatch = message.match(/Could not find the '([^']+)' column/i)
  if (quotedMatch?.[1]) {
    return quotedMatch[1]
  }

  const bareMatch = message.match(/column\s+(?:[a-z_]+\.)?([a-z_][a-z0-9_]*)\s+does not exist/i)
  return bareMatch?.[1] || null
}

function normalizeCategoryRow(row: Record<string, unknown>) {
  return {
    ...row,
    name: String(row.name || '').trim(),
    description: row.description ?? null,
    display_order: Number(row.display_order ?? row.sort_order ?? 0),
    is_active: row.is_active ?? true,
  }
}

async function insertCategoryWithFallbacks(
  supabase: ReturnType<typeof getSupabase>,
  payload: Record<string, unknown>,
) {
  let nextPayload = { ...payload }
  let lastError: { message?: string } | null = null

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const result = await supabase.from('categories').insert([nextPayload]).select().single()

    if (!result.error) {
      return result.data ? normalizeCategoryRow(result.data as Record<string, unknown>) : null
    }

    lastError = result.error
    const missingColumn = getMissingColumnName(result.error.message)
    if (!missingColumn || !(missingColumn in nextPayload)) {
      throw result.error
    }

    const { [missingColumn]: _removed, ...rest } = nextPayload
    nextPayload = rest
  }

  throw lastError || new Error('Failed to create category')
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

    const inserted = await insertCategoryWithFallbacks(supabase, {
      name: String(name).trim(),
      description: description ? String(description).trim() : null,
      display_order: Number(display_order) || 0,
      sort_order: Number(display_order) || 0,
      is_active: true,
    })

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
