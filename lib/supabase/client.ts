import { createBrowserClient } from '@supabase/ssr'

let browserClient: ReturnType<typeof createBrowserClient> | null = null

export function createSupabaseFetch(timeoutMs = 6000): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      return await fetch(input, {
        ...init,
        signal: init?.signal ?? controller.signal,
      })
    } finally {
      clearTimeout(timeoutId)
    }
  }
}

function getSupabaseEnv() {
  const rawSupabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
  const supabaseAnonKey =
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '').trim()

  const supabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/i, '')

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables. Please connect Supabase integration.')
  }

  if (!supabaseUrl.startsWith('http')) {
    throw new Error('Invalid NEXT_PUBLIC_SUPABASE_URL. It must start with http or https.')
  }

  return { supabaseUrl, supabaseAnonKey }
}

function getBrowserStorageKeys(supabaseUrl: string) {
  const keys = ['supabase.auth.token']

  try {
    const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
    if (projectRef) {
      keys.push(`sb-${projectRef}-auth-token`)
      keys.push(`sb-${projectRef}-auth-token-code-verifier`)
    }
  } catch {
    // Ignore URL parsing errors and clear generic key only.
  }

  return keys
}

function removeStorageKeyEverywhere(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    // Ignore storage errors.
  }

  try {
    sessionStorage.removeItem(key)
  } catch {
    // Ignore storage errors.
  }
}

function hasUsableRefreshToken(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false

  const payload = value as {
    refresh_token?: unknown
    currentSession?: { refresh_token?: unknown } | null
    session?: { refresh_token?: unknown } | null
  }

  const tokenFromCurrentSession = payload.currentSession?.refresh_token
  const tokenFromSession = payload.session?.refresh_token
  const directToken = payload.refresh_token

  const refreshToken = tokenFromCurrentSession || tokenFromSession || directToken
  return typeof refreshToken === 'string' && refreshToken.trim().length > 0
}

function sanitizeSupabaseAuthStorage(supabaseUrl: string) {
  if (typeof window === 'undefined') return

  const keys = getBrowserStorageKeys(supabaseUrl)

  for (const key of keys) {
    const raw = localStorage.getItem(key) ?? sessionStorage.getItem(key)
    if (!raw) continue

    try {
      const parsed = JSON.parse(raw) as unknown
      if (!hasUsableRefreshToken(parsed)) {
        removeStorageKeyEverywhere(key)
      }
    } catch {
      // Any malformed token blob is treated as stale and removed.
      removeStorageKeyEverywhere(key)
    }
  }
}

export function clearSupabaseAuthStorage() {
  if (typeof window === 'undefined') return

  try {
    const { supabaseUrl } = getSupabaseEnv()
    const keys = getBrowserStorageKeys(supabaseUrl)
    keys.forEach((key) => removeStorageKeyEverywhere(key))
  } catch {
    removeStorageKeyEverywhere('supabase.auth.token')
  }
}

export function createClient() {
  if (browserClient) {
    return browserClient
  }

  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv()
  sanitizeSupabaseAuthStorage(supabaseUrl)

  browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: createSupabaseFetch(6000),
    },
  })

  return browserClient
}
