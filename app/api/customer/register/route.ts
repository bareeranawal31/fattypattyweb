import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface RegisterBody {
  email?: string
  password?: string
  fullName?: string
}

async function upsertPublicUser(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  email: string,
  fullName: string,
) {
  const candidates: Array<Record<string, unknown>> = [
    {
      id: userId,
      name: fullName || null,
      email,
      phone: null,
      loyalty_points: 0,
      is_active: true,
    },
    {
      id: userId,
      name: fullName || null,
      email,
      phone: null,
      loyalty_points: 0,
    },
    {
      id: userId,
      name: fullName || null,
      email,
      phone: null,
    },
    {
      id: userId,
      name: fullName || null,
      email,
    },
    {
      id: userId,
      email,
    },
  ]

  for (const payload of candidates) {
    const { error } = await supabase
      .from('users')
      .upsert(payload, { onConflict: 'id' })

    if (!error) {
      return null
    }

    const isMissingColumn = /Could not find the '.*' column/.test(error.message || '')
    if (!isMissingColumn) {
      return error
    }
  }

  return new Error('Unable to write users row for this schema')
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegisterBody
    const email = (body.email || '').trim().toLowerCase()
    const password = body.password || ''
    const fullName = (body.fullName || '').trim()

    if (!email || !password) {
      return NextResponse.json({ data: null, error: 'Email and password are required' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ data: null, error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: createdUser, error: createUserError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName || null,
      },
    })

    if (createUserError || !createdUser.user) {
      const message = createUserError?.message || 'Failed to create customer account'
      const isExisting = /already|exists|registered/i.test(message)
      return NextResponse.json({ data: null, error: isExisting ? 'Account already exists. Please sign in.' : message }, { status: 400 })
    }

    const userUpsertError = await upsertPublicUser(supabase, createdUser.user.id, email, fullName)
    if (userUpsertError) {
      console.warn('Could not upsert users row during registration:', userUpsertError)
    }

    await supabase
      .from('customer_profiles')
      .upsert(
        {
          id: createdUser.user.id,
          email,
          full_name: fullName || null,
          current_points: 0,
          lifetime_points_earned: 0,
          total_points_redeemed: 0,
        },
        { onConflict: 'id' },
      )

    return NextResponse.json({
      data: {
        id: createdUser.user.id,
        email,
      },
      error: null,
    })
  } catch (error) {
    console.error('Error creating customer account:', error)
    return NextResponse.json({ data: null, error: 'Failed to create customer account' }, { status: 500 })
  }
}