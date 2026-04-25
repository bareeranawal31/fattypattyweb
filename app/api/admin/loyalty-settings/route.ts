import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface LoyaltySettingsBody {
  rupees_per_point?: number
  redeem_value_per_point?: number
  min_order_amount?: number
}

export async function GET() {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('loyalty_settings')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error

    return NextResponse.json({
      data: data || {
        rupees_per_point: 100,
        redeem_value_per_point: 1,
        min_order_amount: 0,
      },
      error: null,
    })
  } catch (error) {
    console.error('Error loading loyalty settings:', error)
    return NextResponse.json({ data: null, error: 'Failed to load loyalty settings' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as LoyaltySettingsBody
    const supabase = createAdminClient()

    const { data: current } = await supabase
      .from('loyalty_settings')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!current) {
      const { data, error } = await supabase
        .from('loyalty_settings')
        .insert({
          rupees_per_point: body.rupees_per_point || 100,
          redeem_value_per_point: body.redeem_value_per_point || 1,
          min_order_amount: body.min_order_amount || 0,
          is_active: true,
        })
        .select('*')
        .single()

      if (error) throw error

      return NextResponse.json({ data, error: null })
    }

    const { data, error } = await supabase
      .from('loyalty_settings')
      .update({
        rupees_per_point: body.rupees_per_point ?? current.rupees_per_point,
        redeem_value_per_point: body.redeem_value_per_point ?? current.redeem_value_per_point,
        min_order_amount: body.min_order_amount ?? current.min_order_amount,
      })
      .eq('id', current.id)
      .select('*')
      .single()

    if (error) throw error

    return NextResponse.json({ data, error: null })
  } catch (error) {
    console.error('Error updating loyalty settings:', error)
    return NextResponse.json({ data: null, error: 'Failed to update loyalty settings' }, { status: 500 })
  }
}
