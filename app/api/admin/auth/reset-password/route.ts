import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface ResetPasswordBody {
  email?: string
}

const ADMIN_EMAIL = 'fattypattyadmin@gmail.com'

function looksLikeUserNotFound(message: string) {
  return /user with this email not found|user not found/i.test(message)
}

function randomTempPassword() {
  return `Admin@${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

export async function POST(request: Request) {
  try {
    const requestUrl = new URL(request.url)
    const body = (await request.json()) as ResetPasswordBody
    const email = (body.email || '').trim().toLowerCase()

    if (!email) {
      return NextResponse.json({ data: null, error: 'Email is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const redirectTo = `${requestUrl.origin}/admin/login/reset-password`

    let { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo },
    })

    if (error && looksLikeUserNotFound(error.message) && email === ADMIN_EMAIL) {
      const createResult = await supabase.auth.admin.createUser({
        email,
        password: randomTempPassword(),
        email_confirm: true,
        user_metadata: {
          role: 'admin',
        },
      })

      if (createResult.error && !/already registered|already exists/i.test(createResult.error.message || '')) {
        return NextResponse.json({ data: null, error: createResult.error.message }, { status: 400 })
      }

      const retry = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo },
      })
      data = retry.data
      error = retry.error
    }

    if (error) {
      return NextResponse.json({ data: null, error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      {
        data: {
          email,
          action_link: data.properties?.action_link || null,
        },
        error: null,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error('Error generating admin password reset link:', error)
    return NextResponse.json({ data: null, error: 'Failed to generate reset link' }, { status: 500 })
  }
}
