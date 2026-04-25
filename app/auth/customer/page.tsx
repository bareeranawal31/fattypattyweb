"use client"

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react'
import { toast } from '@/lib/notify'
import { useCustomerAuth } from '@/lib/customer-auth-context'

function CustomerAuthContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signIn, signUp, requestPasswordReset } = useCustomerAuth()

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fullName, setFullName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const rawReturnTo = searchParams.get('returnTo') || '/profile'
  const returnTo = rawReturnTo.startsWith('/') && !rawReturnTo.startsWith('//') ? rawReturnTo : '/profile'

  useEffect(() => {
    const oauthError = searchParams.get('error')
    if (!oauthError) {
      return
    }

    toast.error(oauthError)
    router.replace('/auth/customer')
  }, [router, searchParams])

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const result =
        mode === 'signin'
          ? await signIn(email.trim(), password)
          : await signUp(email.trim(), password, fullName.trim())

      if (result.error) {
        toast.error(result.error)
        return
      }

      if (mode === 'signup') {
        const loginResult = await signIn(email.trim(), password)
        if (loginResult.error) {
          toast.error(loginResult.error)
          return
        }
        toast.success('Account created successfully')
        router.push(returnTo)
        return
      }

      toast.success('Signed in successfully')
      router.push(returnTo)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim()
    if (!cleanEmail) {
      toast.error('Enter your email first')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await requestPasswordReset(cleanEmail)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Password reset email sent. Please check your inbox.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#fff7f2] via-background to-[#fff1e8] px-4 py-20">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-foreground">Customer Sign In</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to earn loyalty points and track admin replies.
          </p>
        </div>

        <div className="mb-4 grid grid-cols-2 rounded-xl bg-muted p-1">
          <button
            type="button"
            onClick={() => setMode('signin')}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              mode === 'signin' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              mode === 'signup' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-3">
          {mode === 'signup' && (
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              autoComplete="name"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
            />
          )}

          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your Gmail address"
            autoComplete="email"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
          />

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-11 text-sm focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {mode === 'signin' && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="font-medium text-brand-red hover:underline"
              >
                Forgot password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-red px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-brand-red/90 disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Continue shopping as guest from <Link href="/menu" className="text-brand-red underline">Menu</Link>.
        </p>
      </div>
    </main>
  )
}

export default function CustomerAuthPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gradient-to-b from-[#fff7f2] via-background to-[#fff1e8] px-4 py-20">
          <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h1 className="text-2xl font-bold text-foreground">Customer Sign In</h1>
            <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
              Loading sign-in form...
            </div>
          </div>
        </main>
      }
    >
      <CustomerAuthContent />
    </Suspense>
  )
}
