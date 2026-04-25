import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
  }
  return createClient(supabaseUrl, supabaseKey)
}

function getMissingColumnName(message: string | undefined): string | null {
  if (!message) return null

  const quotedMatch = message.match(/Could not find the '([^']+)' column/i)
  if (quotedMatch?.[1]) return quotedMatch[1]

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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    return NextResponse.json({ data: normalizeCategoryRow(data as Record<string, unknown>) }, { status: 200 })
  } catch (error) {
    console.error('[v0] Error fetching category:', error)
    return NextResponse.json(
      { error: 'Failed to fetch category' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const supabase = getSupabase()

    // Translate V2 admin UI fields to V1 DB columns
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (body.name !== undefined) updatePayload.name = body.name
    if (body.description !== undefined) updatePayload.description = body.description
    if (body.image_url !== undefined) updatePayload.image = body.image_url
    if (body.display_order !== undefined) updatePayload.display_order = body.display_order
    if (body.is_active !== undefined) updatePayload.is_active = body.is_active

    let nextPayload = { ...updatePayload }
    let updatedRow: Record<string, unknown> | null = null
    let lastError: { message?: string } | null = null

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const { data, error } = await supabase
        .from('categories')
        .update(nextPayload)
        .eq('id', id)
        .select()
        .single()

      if (!error) {
        updatedRow = data as Record<string, unknown>
        break
      }

      lastError = error
      const missingColumn = getMissingColumnName(error.message)
      if (!missingColumn || !(missingColumn in nextPayload)) {
        throw error
      }

      const { [missingColumn]: _removed, ...rest } = nextPayload
      nextPayload = rest
    }

    if (!updatedRow) {
      throw lastError || new Error('Failed to update category')
    }

    return NextResponse.json({ data: normalizeCategoryRow(updatedRow) }, { status: 200 })
  } catch (error) {
    console.error('[v0] Error updating category:', error)
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getSupabase()

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)

    if (error) {
      if (/foreign key|constraint/i.test(error.message || '')) {
        return NextResponse.json(
          { error: 'Cannot delete category while menu items still reference it. Remove or reassign those items first.' },
          { status: 400 }
        )
      }
      throw error
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete category'
    console.error('[v0] Error deleting category:', message, error)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
