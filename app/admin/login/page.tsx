'use client'

import { useState, useEffect } from 'react'
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react'
import { toast } from '@/lib/notify'
import { createClient } from '@/lib/supabase/client'
import { getStoredAdminUser, setStoredAdminUser } from '@/lib/admin-auth'

const ADMIN_EMAIL = "fattypattyadmin@gmail.com"
const ADMIN_PASSWORD = "fatty@14"

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activeRole, setActiveRole] = useState<'admin' | 'staff'>('admin')

  // Check if already logged in
  useEffect(() => {
    const user = getStoredAdminUser()
    if (user) {
      window.location.href = user.role === 'staff' ? '/admin/staff-dashboard' : '/admin'
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const emailInput = email.trim().toLowerCase()
    const passwordInput = password.trim()

    try {
      if (activeRole === 'admin') {
        // Admin Login
        if (emailInput !== ADMIN_EMAIL.toLowerCase()) {
          toast.error('Only admin email is allowed')
          setIsLoading(false)
          return
        }

        // Legacy fallback remains for compatibility.
        if (passwordInput === ADMIN_PASSWORD) {
          sessionStorage.setItem('fpUser', JSON.stringify({
            name: 'Admin',
            role: 'admin',
            email: emailInput,
            loginTime: new Date().toISOString()
          }))
          setStoredAdminUser({
            name: 'Admin',
            role: 'admin',
            email: emailInput,
            loginTime: new Date().toISOString(),
          })
          toast.success('Signed in successfully')
          window.location.href = '/admin'
          return
        }

        let error: { message: string } | null = null
        try {
          const supabase = createClient()
          const authResult = await supabase.auth.signInWithPassword({
            email: emailInput,
            password: passwordInput,
          })
          error = authResult.error
        } catch {
          toast.error('Authentication is unavailable right now. Please try again.')
          setIsLoading(false)
          return
        }

        if (!error) {
          sessionStorage.setItem('fpUser', JSON.stringify({
            name: 'Admin',
            role: 'admin',
            email: emailInput,
            loginTime: new Date().toISOString()
          }))
          setStoredAdminUser({
            name: 'Admin',
            role: 'admin',
            email: emailInput,
            loginTime: new Date().toISOString(),
          })
          toast.success('Signed in successfully')
          window.location.href = '/admin'
          return
        }

        toast.error('Invalid admin credentials')
      } else {
        try {
          const response = await fetch('/api/admin/staff-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailInput, password: passwordInput }),
          })

          const result = await response.json()
          if (!response.ok || result.error) {
            throw new Error(result.error || 'Invalid staff credentials')
          }

          const staffUser = {
            name: result.data.name,
            role: 'staff' as const,
            email: result.data.email,
            loginTime: result.data.loginTime || new Date().toISOString(),
          }

          setStoredAdminUser(staffUser)
          toast.success('Signed in successfully')
          window.location.href = '/admin/staff-dashboard'
          return
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Invalid staff credentials')
        }
      }
    } finally {
      setIsLoading(false)
    }
  }


  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-red">
            <span className="text-2xl font-bold text-primary-foreground">FP</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Fatty Patty</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Portal
          </p>
        </div>

        {/* Role Tabs */}
        <div className="mb-6 flex gap-2 rounded-xl bg-muted p-1">
          <button
            onClick={() => {
              setActiveRole('admin')
              setEmail('')
              setPassword('')
            }}
            className={`flex-1 rounded-lg py-2 px-3 text-sm font-medium transition-all ${
              activeRole === 'admin'
                ? 'bg-brand-red text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            👑 Admin
          </button>
          <button
            onClick={() => {
              setActiveRole('staff')
              setEmail('')
              setPassword('')
            }}
            className={`flex-1 rounded-lg py-2 px-3 text-sm font-medium transition-all ${
              activeRole === 'staff'
                ? 'bg-brand-red text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            👤 Staff
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-foreground">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                id="email"
                type="email"
                required
                placeholder={activeRole === 'admin' ? 'admin@fattypatty.com' : 'staff@fattypatty.com'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-border bg-background py-3 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-foreground">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-border bg-background py-3 pl-11 pr-11 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
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
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-red py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-brand-red/90 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Fatty Patty Admin Panel
        </p>
      </div>
    </div>
  )
}
