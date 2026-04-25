import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deliveryAreas as fallbackDeliveryAreas } from '@/lib/service-areas'

interface AddressBody {
  label?: string
  address_line?: string
  area?: string
  city?: string
  notes?: string
  is_default?: boolean
}

async function getUserContext() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { supabase, user: null }
  }

  return { supabase, user }
}

async function getValidDeliveryAreas(supabase: Awaited<ReturnType<typeof createClient>>) {
  try {
    const { data, error } = await supabase
      .from('delivery_areas')
      .select('area_name,is_active')

    if (error || !Array.isArray(data)) {
      return fallbackDeliveryAreas
    }

    const dbAreas = Array.from(
      new Set(
        data
          .filter((area) => area.is_active !== false)
          .map((area) => area.area_name?.trim() || '')
          .filter(Boolean),
      ),
    )

    return dbAreas.length > 0 ? dbAreas : fallbackDeliveryAreas
  } catch {
    return fallbackDeliveryAreas
  }
}

export async function GET() {
  try {
    const { supabase, user } = await getUserContext()
    if (!user) {
      return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('delivery_addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ data, error: null })
  } catch (error) {
    console.error('Error loading addresses:', error)
    return NextResponse.json({ data: [], error: 'Failed to load addresses' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getUserContext()
    if (!user) {
      return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as AddressBody
    const addressLine = body.address_line?.trim() || ''
    const area = body.area?.trim() || ''
    const validDeliveryAreas = await getValidDeliveryAreas(supabase)

    if (!addressLine) {
      return NextResponse.json({ data: null, error: 'Address is required' }, { status: 400 })
    }

    if (!area || !validDeliveryAreas.includes(area)) {
      return NextResponse.json({ data: null, error: 'Please select a valid delivery area' }, { status: 400 })
    }

    if (body.is_default) {
      await supabase
        .from('delivery_addresses')
        .update({ is_default: false })
        .eq('user_id', user.id)
    }

    const { data, error } = await supabase
      .from('delivery_addresses')
      .insert({
        user_id: user.id,
        label: body.label?.trim() || 'Home',
        address_line: addressLine,
        area,
        city: body.city?.trim() || 'Karachi',
        notes: body.notes?.trim() || null,
        is_default: Boolean(body.is_default),
      })
      .select('*')
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ data, error: null })
  } catch (error) {
    console.error('Error creating address:', error)
    return NextResponse.json({ data: null, error: 'Failed to create address' }, { status: 500 })
  }
}
