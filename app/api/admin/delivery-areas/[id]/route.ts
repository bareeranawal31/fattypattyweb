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

interface PolygonPoint {
  lat: number
  lng: number
}

interface DeliveryAreaPayload {
  branch_id?: string
  area_name?: string
  delivery_fee?: number
  min_order_amount?: number
  estimated_time_minutes?: number
  is_active?: boolean
  polygon_coordinates?: PolygonPoint[] | null
}

function isValidPolygon(value: unknown): value is PolygonPoint[] {
  if (!Array.isArray(value) || value.length < 3) {
    return false
  }

  return value.every((point) => {
    if (!point || typeof point !== 'object') return false
    const record = point as Record<string, unknown>
    const lat = Number(record.lat)
    const lng = Number(record.lng)
    return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
  })
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
    const body = (await request.json()) as DeliveryAreaPayload

    if (body.polygon_coordinates && !isValidPolygon(body.polygon_coordinates)) {
      return NextResponse.json({ data: null, error: 'Polygon must contain at least 3 valid points' }, { status: 400 })
    }

    const payload: Record<string, unknown> = {}
    if (body.branch_id !== undefined) payload.branch_id = body.branch_id
    if (body.area_name !== undefined) payload.area_name = body.area_name.trim()
    if (body.delivery_fee !== undefined) payload.delivery_fee = Number(body.delivery_fee)
    if (body.min_order_amount !== undefined) payload.min_order_amount = Number(body.min_order_amount)
    if (body.estimated_time_minutes !== undefined) payload.estimated_time_minutes = Number(body.estimated_time_minutes)
    if (body.is_active !== undefined) payload.is_active = body.is_active
    if (body.polygon_coordinates !== undefined) payload.polygon_coordinates = body.polygon_coordinates

    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('delivery_areas')
      .update(payload)
      .eq('id', id)
      .select('*,branch:branches(id,name,address)')
      .single()

    if (error) throw error

    return NextResponse.json({ data, error: null })
  } catch (error) {
    console.error('Error updating delivery area:', error)
    return NextResponse.json({ data: null, error: 'Failed to update delivery area' }, { status: 500 })
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
    const { error } = await supabase.from('delivery_areas').delete().eq('id', id)

    if (error) throw error

    return NextResponse.json({ data: { id }, error: null })
  } catch (error) {
    console.error('Error deleting delivery area:', error)
    return NextResponse.json({ data: null, error: 'Failed to delete delivery area' }, { status: 500 })
  }
}
