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

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ data: [], error: null, _fallback: true }, { status: 200 })
  }

  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.warn('Falling back to empty admin branch list:', error.message)
      return NextResponse.json({ data: [], error: null, _fallback: true }, { status: 200 })
    }

    return NextResponse.json({ data, error: null })
  } catch (error) {
    console.error('Error fetching admin branches:', error)
    return NextResponse.json({ data: [], error: null, _fallback: true }, { status: 200 })
  }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ data: null, error: 'Supabase not configured' }, { status: 500 })
  }

  try {
    const body = (await request.json()) as BranchPayload
    if (!body.name?.trim() || !body.address?.trim()) {
      return NextResponse.json({ data: null, error: 'Name and address are required' }, { status: 400 })
    }

    if (!isValidCoordinate(body.latitude, 'lat') || !isValidCoordinate(body.longitude, 'lng')) {
      return NextResponse.json({ data: null, error: 'Valid latitude and longitude are required' }, { status: 400 })
    }

    const deliveryRadius = Number(body.delivery_radius)
    if (!Number.isFinite(deliveryRadius) || deliveryRadius <= 0) {
      return NextResponse.json({ data: null, error: 'Delivery radius must be greater than 0' }, { status: 400 })
    }

    const supabase = getSupabase()
    const payload = {
      name: body.name.trim(),
      address: body.address.trim(),
      city: body.city?.trim() || 'Karachi',
      latitude: Number(body.latitude),
      longitude: Number(body.longitude),
      delivery_radius: deliveryRadius,
      is_active: body.is_active ?? true,
      accepts_pickup: body.accepts_pickup ?? true,
      accepts_delivery: body.accepts_delivery ?? true,
    }

    const { data, error } = await supabase
      .from('branches')
      .insert(payload)
      .select('*')
      .single()

    if (error) throw error

    return NextResponse.json({ data, error: null })
  } catch (error) {
    console.error('Error creating branch:', error)
    return NextResponse.json({ data: null, error: 'Failed to create branch' }, { status: 500 })
  }
}
