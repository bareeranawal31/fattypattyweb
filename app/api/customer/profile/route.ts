import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const LOYALTY_MIN_ORDER_AMOUNT = 1500
const LOYALTY_FIXED_POINTS = 15

function normalizeEmail(email: string | null | undefined): string | null {
  return email?.trim().toLowerCase() || null
}

async function getDerivedLoyaltySnapshot(userId: string, email: string | null) {
  const supabase = await createClient()
  const normalizedEmail = normalizeEmail(email)
  const [{ data: byUserId, error: byUserIdError }, { data: byEmail, error: byEmailError }] = await Promise.all([
    supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId),
    normalizedEmail
      ? supabase
          .from('orders')
          .select('*')
          .is('user_id', null)
          .ilike('customer_email', normalizedEmail)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (byUserIdError) {
    throw byUserIdError
  }

  if (byEmailError) {
    throw byEmailError
  }

  const orders = Array.from(
    new Map([...(byUserId || []), ...(byEmail || [])].map((order) => [String(order.id), order])).values(),
  )

  const lifetimePointsEarned = orders.reduce((sum, order) => {
    const explicitEarned = Number(order.loyalty_points_earned)
    if (Number.isFinite(explicitEarned) && explicitEarned > 0) {
      return sum + explicitEarned
    }

    return sum + (Number(order.total || 0) >= LOYALTY_MIN_ORDER_AMOUNT ? LOYALTY_FIXED_POINTS : 0)
  }, 0)

  const totalPointsRedeemed = orders.reduce((sum, order) => {
    const redeemed = Number(order.loyalty_points_redeemed || 0)
    return sum + (Number.isFinite(redeemed) ? redeemed : 0)
  }, 0)

  return {
    current_points: Math.max(0, lifetimePointsEarned - totalPointsRedeemed),
    lifetime_points_earned: lifetimePointsEarned,
    total_points_redeemed: totalPointsRedeemed,
  }
}

async function ensureCustomerProfile() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { profile: null, status: 401 as const, error: 'Unauthorized' }
  }

  const [{ data: existing, error: selectError }, { data: userRow }] = await Promise.all([
    supabase
      .from('customer_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('users')
      .select('name,email,phone,loyalty_points')
      .eq('id', user.id)
      .maybeSingle(),
  ])

  let derivedLoyalty = {
    current_points: 0,
    lifetime_points_earned: 0,
    total_points_redeemed: 0,
  }

  try {
    derivedLoyalty = await getDerivedLoyaltySnapshot(user.id, user.email || userRow?.email || null)
  } catch (error) {
    console.warn('Failed to derive customer loyalty from orders:', error)
  }

  if (selectError) {
    return { profile: null, status: 500 as const, error: 'Failed to load profile' }
  }

  if (existing) {
    const mergedEmail = normalizeEmail(existing.email || userRow?.email || user.email || '') || ''
    const mergedProfile = {
      ...existing,
      email: mergedEmail,
      full_name: existing.full_name || userRow?.name || (user.user_metadata?.full_name as string | undefined) || null,
      current_points: Math.max(
        Number(existing.current_points || 0),
        Number(userRow?.loyalty_points || 0),
        Number(derivedLoyalty.current_points || 0),
      ),
      lifetime_points_earned: Math.max(
        Number(existing.lifetime_points_earned || 0),
        Number(derivedLoyalty.lifetime_points_earned || 0),
      ),
      total_points_redeemed: Math.max(
        Number(existing.total_points_redeemed || 0),
        Number(derivedLoyalty.total_points_redeemed || 0),
      ),
    }

    if (
      mergedProfile.email !== existing.email ||
      mergedProfile.full_name !== existing.full_name ||
      mergedProfile.current_points !== existing.current_points ||
      mergedProfile.lifetime_points_earned !== existing.lifetime_points_earned ||
      mergedProfile.total_points_redeemed !== existing.total_points_redeemed
    ) {
      await supabase
        .from('customer_profiles')
        .update({
          email: mergedProfile.email,
          full_name: mergedProfile.full_name,
          current_points: mergedProfile.current_points,
          lifetime_points_earned: mergedProfile.lifetime_points_earned,
          total_points_redeemed: mergedProfile.total_points_redeemed,
        })
        .eq('id', user.id)
    }

    if (mergedProfile.current_points !== Number(userRow?.loyalty_points || 0)) {
      const { error: syncError } = await supabase
        .from('users')
        .upsert(
          {
            id: user.id,
            email: mergedProfile.email || '',
            name: mergedProfile.full_name || null,
            loyalty_points: mergedProfile.current_points,
          },
          { onConflict: 'id' },
        )

      if (syncError) {
        console.warn('Failed to sync loyalty points to users row:', syncError.message)
      }
    }

    return { profile: mergedProfile, status: 200 as const, error: null }
  }

  const insertPayload = {
    id: user.id,
    email: normalizeEmail(userRow?.email || user.email || '') || '',
    full_name: userRow?.name || (user.user_metadata?.full_name as string | undefined) || null,
    current_points: Math.max(Number(userRow?.loyalty_points || 0), Number(derivedLoyalty.current_points || 0)),
    lifetime_points_earned: Number(derivedLoyalty.lifetime_points_earned || 0),
    total_points_redeemed: Number(derivedLoyalty.total_points_redeemed || 0),
  }

  const { data: created, error: insertError } = await supabase
    .from('customer_profiles')
    .insert(insertPayload)
    .select('*')
    .single()

  if (insertError) {
    return { profile: null, status: 500 as const, error: 'Failed to create profile' }
  }

  const { error: syncError } = await supabase
    .from('users')
    .upsert(
      {
        id: user.id,
        email: created.email || '',
        name: created.full_name || null,
        loyalty_points: created.current_points,
      },
      { onConflict: 'id' },
    )

  if (syncError) {
    console.warn('Failed to sync loyalty points to users row after profile creation:', syncError.message)
  }

  return { profile: created, status: 200 as const, error: null }
}

export async function GET() {
  const result = await ensureCustomerProfile()

  if (result.error) {
    return NextResponse.json({ data: null, error: result.error }, { status: result.status })
  }

  return NextResponse.json({ data: result.profile, error: null })
}
