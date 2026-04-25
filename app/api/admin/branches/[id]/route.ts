import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

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

interface BranchPayload {
  name?: string
  address?: string
  city?: string | null
  latitude?: number | null
  longitude?: number | null
  delivery_radius?: number | null
  is_active?: boolean
  accepts_pickup?: boolean
  accepts_delivery?: boolean
}

function isValidCoordinate(value: unknown, type: 'lat' | 'lng') {
  const n = Number(value)
  if (!Number.isFinite(n)) return false
  return type === 'lat' ? n >= -90 && n <= 90 : n >= -180 && n <= 180
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ data: null, error: 'Supabase not configured' }, { status: 500 })
  }

  try {
    const { id } = await params
    const body = (await request.json()) as BranchPayload

    if (body.latitude !== undefined && !isValidCoordinate(body.latitude, 'lat')) {
      return NextResponse.json({ data: null, error: 'Invalid latitude' }, { status: 400 })
    }

    if (body.longitude !== undefined && !isValidCoordinate(body.longitude, 'lng')) {
      return NextResponse.json({ data: null, error: 'Invalid longitude' }, { status: 400 })
    }

    if (body.delivery_radius !== undefined) {
      const radius = Number(body.delivery_radius)
      if (!Number.isFinite(radius) || radius <= 0) {
        return NextResponse.json({ data: null, error: 'Delivery radius must be greater than 0' }, { status: 400 })
      }
    }

    const payload: Record<string, unknown> = {}
    if (body.name !== undefined) payload.name = body.name.trim()
    if (body.address !== undefined) payload.address = body.address.trim()
    if (body.city !== undefined) payload.city = body.city?.trim() || null
    if (body.latitude !== undefined) payload.latitude = Number(body.latitude)
    if (body.longitude !== undefined) payload.longitude = Number(body.longitude)
    if (body.delivery_radius !== undefined) payload.delivery_radius = Number(body.delivery_radius)
    if (body.is_active !== undefined) payload.is_active = body.is_active
    if (body.accepts_pickup !== undefined) payload.accepts_pickup = body.accepts_pickup
    if (body.accepts_delivery !== undefined) payload.accepts_delivery = body.accepts_delivery

    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('branches')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error

    return NextResponse.json({ data, error: null })
  } catch (error) {
    console.error('Error updating branch:', error)
    return NextResponse.json({ data: null, error: 'Failed to update branch' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ data: null, error: 'Supabase not configured' }, { status: 500 })
  }

  try {
    const { id } = await params
    const supabase = getSupabase()

    // Ensure related rows don't block branch delete on stricter schemas.
    await supabase.from('delivery_areas').delete().eq('branch_id', id)
    await supabase.from('orders').update({ branch_id: null }).eq('branch_id', id)

    const { error } = await supabase.from('branches').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ data: { id }, error: null })
  } catch (error) {
    console.error('Error deleting branch:', error)
    return NextResponse.json({ data: null, error: 'Failed to delete branch' }, { status: 500 })
  }
}
