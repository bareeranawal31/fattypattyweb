import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deliveryAreas as fallbackDeliveryAreas } from '@/lib/service-areas'

interface AddressPatchBody {
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { supabase, user } = await getUserContext()
    if (!user) {
      return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as AddressPatchBody
    const validDeliveryAreas = await getValidDeliveryAreas(supabase)

    if (body.area !== undefined) {
      const area = body.area.trim()
      if (!area || !validDeliveryAreas.includes(area)) {
        return NextResponse.json({ data: null, error: 'Please select a valid delivery area' }, { status: 400 })
      }
    }

    if (body.is_default) {
      await supabase
        .from('delivery_addresses')
        .update({ is_default: false })
        .eq('user_id', user.id)
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (body.label !== undefined) updatePayload.label = body.label.trim() || 'Home'
    if (body.address_line !== undefined) updatePayload.address_line = body.address_line.trim()
    if (body.area !== undefined) updatePayload.area = body.area.trim()
    if (body.city !== undefined) updatePayload.city = body.city.trim() || 'Karachi'
    if (body.notes !== undefined) updatePayload.notes = body.notes.trim() || null
    if (body.is_default !== undefined) updatePayload.is_default = Boolean(body.is_default)

    const { data, error } = await supabase
      .from('delivery_addresses')
      .update(updatePayload)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (error) throw error

    return NextResponse.json({ data, error: null })
  } catch (error) {
    console.error('Error updating address:', error)
    return NextResponse.json({ data: null, error: 'Failed to update address' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { supabase, user } = await getUserContext()
    if (!user) {
      return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('delivery_addresses')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ data: { id }, error: null })
  } catch (error) {
    console.error('Error deleting address:', error)
    return NextResponse.json({ data: null, error: 'Failed to delete address' }, { status: 500 })
  }
}
