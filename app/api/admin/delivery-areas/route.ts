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
  polygon_coordinates?: PolygonPoint[]
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

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ data: [], error: null, _fallback: true }, { status: 200 })
  }

  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('delivery_areas')
      .select('*,branch:branches(id,name,address)')
      .order('area_name', { ascending: true })

    if (error) {
      console.warn('Falling back to empty delivery area list:', error.message)
      return NextResponse.json({ data: [], error: null, _fallback: true }, { status: 200 })
    }

    return NextResponse.json({ data, error: null })
  } catch (error) {
    console.error('Error fetching delivery areas:', error)
    return NextResponse.json({ data: [], error: null, _fallback: true }, { status: 200 })
  }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ data: null, error: 'Supabase not configured' }, { status: 500 })
  }

  try {
    const body = (await request.json()) as DeliveryAreaPayload
    if (!body.branch_id || !body.area_name?.trim()) {
      return NextResponse.json({ data: null, error: 'branch_id and area_name are required' }, { status: 400 })
    }

    if (body.polygon_coordinates && !isValidPolygon(body.polygon_coordinates)) {
      return NextResponse.json({ data: null, error: 'Polygon must contain at least 3 valid points' }, { status: 400 })
    }

    const payload = {
      branch_id: body.branch_id,
      area_name: body.area_name.trim(),
      delivery_fee: Number(body.delivery_fee || 0),
      min_order_amount: Number(body.min_order_amount || 0),
      estimated_time_minutes: Number(body.estimated_time_minutes || 40),
      is_active: body.is_active ?? true,
      polygon_coordinates: body.polygon_coordinates ?? null,
    }

    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('delivery_areas')
      .insert(payload)
      .select('*,branch:branches(id,name,address)')
      .single()

    if (error) throw error

    return NextResponse.json({ data, error: null })
  } catch (error) {
    console.error('Error creating delivery area:', error)
    return NextResponse.json({ data: null, error: 'Failed to create delivery area' }, { status: 500 })
  }
}
