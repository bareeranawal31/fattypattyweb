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

export function clearSupabaseAuthStorage() {
  if (typeof window === 'undefined') return

  try {
    const { supabaseUrl } = getSupabaseEnv()
    const keys = getBrowserStorageKeys(supabaseUrl)
    keys.forEach((key) => localStorage.removeItem(key))
  } catch {
    localStorage.removeItem('supabase.auth.token')
  }
}

export function createClient() {
  if (browserClient) {
    return browserClient
  }

  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv()
  browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: createSupabaseFetch(6000),
    },
  })

  return browserClient
}
