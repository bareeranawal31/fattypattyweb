import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function getSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)')
  }
  return createClient(supabaseUrl, supabaseServiceKey)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { type, is_available } = await request.json()

    const supabase = getSupabase()

    if (type === 'item') {
      const { data, error } = await supabase
        .from('menu_items')
        .update({ is_available, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
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
      }
      return NextResponse.json({ data: transformed, error: null })
    } else if (type === 'deal') {
      const { data, error } = await supabase
        .from('deals')
        .update({ is_active: is_available, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // Transform to admin UI format
      const transformed = {
        id: data.id,
        name: data.name,
        description: data.title || data.name,
        deal_type: 'combo',
        fixed_price: data.price,
        discount_percentage: null,
        is_active: data.is_active,
        image_url: data.image || null,
      }
      return NextResponse.json({ data: transformed, error: null })
    }

    return NextResponse.json(
      { data: null, error: 'Invalid type' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error toggling availability:', error)
    return NextResponse.json(
      { data: null, error: 'Failed to update' },
      { status: 500 }
    )
  }
}
