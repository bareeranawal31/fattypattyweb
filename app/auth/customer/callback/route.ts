import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const oauthError = requestUrl.searchParams.get('error')
  const oauthErrorDescription = requestUrl.searchParams.get('error_description')
  const rawReturnTo = requestUrl.searchParams.get('returnTo') || '/profile'
  const returnTo = rawReturnTo.startsWith('/') && !rawReturnTo.startsWith('//') ? rawReturnTo : '/profile'

  if (oauthError || oauthErrorDescription) {
    const message = oauthErrorDescription || oauthError || 'Google sign-in failed.'
    return NextResponse.redirect(new URL(`/auth/customer?error=${encodeURIComponent(message)}`, requestUrl.origin))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/auth/customer?error=Missing%20login%20code.%20Please%20try%20again.', requestUrl.origin))
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(new URL(`/auth/customer?error=${encodeURIComponent(error.message)}`, requestUrl.origin))
    }
  } catch {
    return NextResponse.redirect(new URL('/auth/customer?error=Could%20not%20complete%20Google%20sign-in.%20Please%20try%20again.', requestUrl.origin))
  }

  return NextResponse.redirect(new URL(returnTo, requestUrl.origin))
}
