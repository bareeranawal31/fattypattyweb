"use client"

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Loader2, LockKeyhole } from 'lucide-react'
import { toast } from '@/lib/notify'
import { createClient } from '@/lib/supabase/client'

function AdminResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPreparingRecovery, setIsPreparingRecovery] = useState(true)

  useEffect(() => {
    let mounted = true

    const prepareRecoverySession = async () => {
      const code = searchParams.get('code')
      if (!code) {
        if (mounted) {
          setIsPreparingRecovery(false)
        }
        return
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        toast.error('Recovery link is invalid or expired. Please request a new one.')
        router.replace('/admin/login')
        return
      }

      if (mounted) {
        setIsPreparingRecovery(false)
      }
    }

    prepareRecoverySession()
    return () => {
      mounted = false
    }
  }, [router, searchParams, supabase.auth])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        toast.error(error.message)
        return
      }

      toast.success('Admin password updated successfully')
      router.push('/admin/login')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-20">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <h1 className="text-2xl font-bold text-foreground">Reset Admin Password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set a new password for your admin account.
        </p>

        {isPreparingRecovery && (
          <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            Verifying recovery link...
          </div>
        )}

        <form onSubmit={handleResetPassword} className="mt-5 space-y-3">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password (min 6 characters)"
              disabled={isPreparingRecovery}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-11 text-sm focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted"
              aria-label={showPassword ? 'Hide new password' : 'Show new password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              disabled={isPreparingRecovery}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-11 text-sm focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted"
              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isPreparingRecovery}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-red px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-brand-red/90 disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
            Update Password
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Back to <Link href="/admin/login" className="text-brand-red underline">Admin Login</Link>
        </p>
      </div>
    </main>
  )
}

export default function AdminResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-background px-4 py-20">
          <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h1 className="text-2xl font-bold text-foreground">Reset Admin Password</h1>
            <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
              Loading reset form...
            </div>
          </div>
        </main>
      }
    >
      <AdminResetPasswordContent />
    </Suspense>
  )
}
