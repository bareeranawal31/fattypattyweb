import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

interface UpdateAccountBody {
  name?: string
  phone?: string
  currentPassword?: string
  newPassword?: string
}

async function getAuthUser() {
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

async function getAccountResponse(user: User) {
  const supabase = await createClient()

  const [{ data: userRow, error: userRowError }, { data: legacyProfile }] = await Promise.all([
    supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('customer_profiles')
      .select('current_points')
      .eq('id', user.id)
      .maybeSingle(),
  ])

  const fallbackPayload = {
    id: user.id,
    name: (user.user_metadata?.full_name as string | undefined) || null,
    email: user.email || '',
    phone: (user.user_metadata?.phone as string | undefined) || null,
    loyalty_points: Number(legacyProfile?.current_points || 0),
  }

  if (userRowError) {
    return fallbackPayload
  }

  if (!userRow) {
    const { data: created, error: insertError } = await supabase
      .from('users')
      .insert(fallbackPayload)
      .select('*')
      .maybeSingle()

    if (insertError || !created) {
      return fallbackPayload
    }

    return {
      ...created,
      loyalty_points: Math.max(
        Number(created.loyalty_points || 0),
        Number(legacyProfile?.current_points || 0),
      ),
    }
  }

  return {
    ...userRow,
    loyalty_points: Math.max(
      Number(userRow.loyalty_points || 0),
      Number(legacyProfile?.current_points || 0),
    ),
  }
}

export async function GET() {
  try {
    const { user } = await getAuthUser()
    if (!user) {
      return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
    }

    const account = await getAccountResponse(user)
    return NextResponse.json({ data: account, error: null })
  } catch (error) {
    console.error('Error loading customer account:', error)
    return NextResponse.json({ data: null, error: 'Failed to load account' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as UpdateAccountBody
    const { supabase, user } = await getAuthUser()

    if (!user) {
      return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
    }

    const updatePayload: Record<string, unknown> = {}

    if (body.name !== undefined) {
      updatePayload.name = body.name.trim() || null
    }

    if (body.phone !== undefined) {
      updatePayload.phone = body.phone.trim() || null
    }

    if (Object.keys(updatePayload).length > 0) {
      const { error: updateError } = await supabase
        .from('users')
        .upsert(
          {
            id: user.id,
            email: user.email || '',
            ...updatePayload,
          },
          { onConflict: 'id' },
        )

      if (updateError) {
        console.warn('users upsert failed, continuing with auth metadata fallback:', updateError.message)
      }

      await supabase.auth.updateUser({
        data: {
          full_name: body.name ?? user.user_metadata?.full_name,
          phone: body.phone ?? user.user_metadata?.phone,
        },
      })
    }

    if (body.newPassword) {
      if (body.newPassword.length < 6) {
        return NextResponse.json({ data: null, error: 'New password must be at least 6 characters' }, { status: 400 })
      }

      const { error: updatePasswordError } = await supabase.auth.updateUser({
        password: body.newPassword,
      })

      if (updatePasswordError) {
        return NextResponse.json({ data: null, error: updatePasswordError.message }, { status: 500 })
      }
    }

    const finalRow = await getAccountResponse(user)
    return NextResponse.json({ data: finalRow, error: null })
  } catch (error) {
    console.error('Error updating customer account:', error)
    return NextResponse.json({ data: null, error: 'Failed to update account' }, { status: 500 })
  }
}
