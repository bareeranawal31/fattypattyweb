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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    // Transform to admin UI format
    const transformed = {
      id: data.id,
      name: data.name,
      description: data.title || data.name,
      items: data.items || [],
      deal_type: 'combo',
      fixed_price: data.price,
      discount_percentage: null,
      is_active: data.is_active ?? true,
      image_url: data.image || null,
      valid_from: data.created_at || new Date().toISOString(),
      valid_until: null,
      created_at: data.created_at,
    }

    return NextResponse.json({ data: transformed }, { status: 200 })
  } catch (error) {
    console.error('[v0] Error fetching deal:', error)
    return NextResponse.json(
      { error: 'Failed to fetch deal' },
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
    if (body.description !== undefined) updatePayload.title = body.description
    if (body.items !== undefined) updatePayload.items = Array.isArray(body.items) ? body.items : []
    if (body.fixed_price !== undefined) updatePayload.price = body.fixed_price
    if (body.image_url !== undefined) updatePayload.image = body.image_url
    if (body.is_active !== undefined) updatePayload.is_active = body.is_active

    const { data, error } = await supabase
      .from('deals')
      .update(updatePayload)
      .eq('id', id)
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

    return NextResponse.json({ data: transformed }, { status: 200 })
  } catch (error) {
    console.error('[v0] Error updating deal:', error)
    return NextResponse.json(
      { error: 'Failed to update deal' },
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
      .from('deals')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('[v0] Error deleting deal:', error)
    return NextResponse.json(
      { error: 'Failed to delete deal' },
      { status: 500 }
    )
  }
}
