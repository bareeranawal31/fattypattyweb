"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { clearSupabaseAuthStorage, createClient } from '@/lib/supabase/client'

export interface CustomerProfile {
  id: string
  email: string
  full_name: string | null

  created_at?: string
  updated_at?: string
}

interface CustomerAuthContextType {
  user: User | null
  profile: CustomerProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: string | null }>
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>
  signInWithGoogle: () => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined)

const CUSTOMER_AUTH_STORAGE_KEY = 'customer-auth-user'
const CUSTOMER_PROFILE_FALLBACK_PREFIX = 'customer-profile-fallback:'

function getFallbackProfileKey(userId: string) {
  return `${CUSTOMER_PROFILE_FALLBACK_PREFIX}${userId}`
}

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      setSupabase(createClient())
    } catch (error) {
      console.warn('Supabase browser client is unavailable.', error)
      setLoading(false)
    }
  }, [])

  const setAuthStorage = useCallback((nextUser: User | null) => {
    if (typeof window === 'undefined') return

    if (!nextUser) {
      localStorage.removeItem(CUSTOMER_AUTH_STORAGE_KEY)
      return
    }

    localStorage.setItem(
      CUSTOMER_AUTH_STORAGE_KEY,
      JSON.stringify({
        id: nextUser.id,
        email: nextUser.email || '',
      }),
    )
  }, [])

  const refreshProfile = useCallback(async () => {
    const getFallbackProfile = () => {
      if (typeof window === 'undefined') return null

      try {
        const authRaw = localStorage.getItem(CUSTOMER_AUTH_STORAGE_KEY)
        if (!authRaw) return null
        const authInfo = JSON.parse(authRaw) as { id?: string }
        if (!authInfo?.id) return null

        const profileRaw = localStorage.getItem(getFallbackProfileKey(authInfo.id))
        if (!profileRaw) return null

        return JSON.parse(profileRaw) as CustomerProfile
      } catch {
        return null
      }
    }

    try {
      const response = await fetch('/api/customer/profile', { cache: 'no-store' })
      const result = await response.json()
      if (response.ok && result.data) {
        const nextProfile = result.data as CustomerProfile
        setProfile(nextProfile)
        if (typeof window !== 'undefined' && nextProfile.id) {
          localStorage.setItem(getFallbackProfileKey(nextProfile.id), JSON.stringify(nextProfile))
        }
        return
      }

      setProfile(getFallbackProfile())
    } catch {
      setProfile(getFallbackProfile())
    }
  }, [])

  useEffect(() => {
    if (!supabase) {
      return
    }

    let mounted = true

    const bootstrap = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!mounted) return

        const nextUser = session?.user ?? null
        setUser(nextUser)
        setAuthStorage(nextUser)

        if (nextUser) {
          await refreshProfile()
        }
      } catch (error) {
        // Recover from stale/invalid browser auth cache (common after key or project changes).
        clearSupabaseAuthStorage()

        if (mounted) {
          setUser(null)
          setProfile(null)
          setAuthStorage(null)
        }

        console.warn('Failed to recover Supabase session, cleared local auth cache.', error)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    bootstrap()

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event: string, session: Session | null) => {
      try {
        const nextUser = session?.user ?? null
        setUser(nextUser)
        setAuthStorage(nextUser)

        if (nextUser) {
          await refreshProfile()
        } else {
          setProfile(null)
        }
      } catch (error) {
        console.warn('Customer auth state update failed.', error)
      }
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [refreshProfile, setAuthStorage, supabase])

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!supabase) {
        return { error: 'Authentication is unavailable right now. Please try again.' }
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return { error: error?.message ?? null }
    },
    [supabase],
  )

  const signUp = useCallback(
    async (email: string, password: string, fullName?: string) => {
      try {
        const response = await fetch('/api/customer/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, fullName }),
        })

        const result = await response.json()
        if (!response.ok || result.error) {
          return { error: result.error || 'Failed to create account' }
        }
        return { error: null }
      } catch {
        return { error: 'Failed to create account' }
      }
    },
    [],
  )

  const requestPasswordReset = useCallback(
    async (email: string) => {
      if (!supabase) {
        return { error: 'Authentication is unavailable right now. Please try again.' }
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/customer/reset-password`,
      })
      return { error: error?.message ?? null }
    },
    [supabase],
  )

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) {
      return { error: 'Authentication is unavailable right now. Please try again.' }
    }

    try {
      const configuredSiteUrl = (process.env.NEXT_PUBLIC_SITE_URL || '').trim()
      const currentOrigin = window.location.origin
      const baseUrl = configuredSiteUrl || currentOrigin
      const redirectTo = `${baseUrl.replace(/\/$/, '')}/auth/customer/callback`

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            prompt: 'select_account',
          },
        },
      })

      return { error: error?.message ?? null }
    } catch {
      return { error: 'Google sign-in could not start. Please try again.' }
    }
  }, [supabase])

  const signOut = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut()
    }

    setProfile(null)
    setUser(null)
    setAuthStorage(null)
  }, [setAuthStorage, supabase])

  return (
    <CustomerAuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signUp,
        requestPasswordReset,
        signInWithGoogle,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  )
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext)
  if (!context) {
    throw new Error('useCustomerAuth must be used within CustomerAuthProvider')
  }
  return context
}
