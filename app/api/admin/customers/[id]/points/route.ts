import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface PointsBody {
  delta?: number
  notes?: string
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = (await request.json()) as PointsBody
    const delta = Number(body.delta || 0)

    if (!Number.isFinite(delta) || delta === 0) {
      return NextResponse.json({ data: null, error: 'delta must be a non-zero number' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const [{ data: customer, error: customerError }, { data: profile, error: profileError }, { data: authCustomer, error: authCustomerError }] = await Promise.all([
      supabase
        .from('users')
        .select('id,name,email,phone,loyalty_points,is_active')
        .eq('id', id)
        .maybeSingle(),
      supabase
        .from('customer_profiles')
        .select('id,email,full_name,current_points,lifetime_points_earned,total_points_redeemed')
        .eq('id', id)
        .maybeSingle(),
      supabase.auth.admin.getUserById(id),
    ])

    if (customerError) throw customerError
    if (profileError) throw profileError
    if (authCustomerError) throw authCustomerError

    const currentPoints = Math.max(Number(customer?.loyalty_points || 0), Number(profile?.current_points || 0))
    const nextPoints = Math.max(0, currentPoints + delta)

    const { data: updated, error: updateError } = await supabase
      .from('users')
      .upsert(
        {
          id,
          name: customer?.name || profile?.full_name || authCustomer.user?.user_metadata?.full_name || null,
          email: customer?.email || profile?.email || authCustomer.user?.email || '',
          phone: customer?.phone || authCustomer.user?.user_metadata?.phone || null,
          loyalty_points: nextPoints,
          is_active: customer?.is_active ?? true,
        },
        { onConflict: 'id' },
      )
      .select('*')
      .single()

    if (updateError) throw updateError

    await supabase
      .from('customer_profiles')
      .upsert(
        {
          id,
          email: profile?.email || customer?.email || authCustomer.user?.email || '',
          full_name: profile?.full_name || customer?.name || authCustomer.user?.user_metadata?.full_name || null,
          current_points: nextPoints,
          lifetime_points_earned: profile?.lifetime_points_earned || 0,
          total_points_redeemed: profile?.total_points_redeemed || 0,
        },
        { onConflict: 'id' },
      )

    await supabase
      .from('loyalty_transactions')
      .insert({
        user_id: id,
        points: delta,
        transaction_type: 'admin_adjustment',
        notes: body.notes || 'Admin points adjustment',
      })

    return NextResponse.json({ data: updated, error: null })
  } catch (error) {
    console.error('Error adjusting loyalty points:', error)
    return NextResponse.json({ data: null, error: 'Failed to adjust loyalty points' }, { status: 500 })
  }
}
