import { createClient } from '@supabase/supabase-js'
import { createSupabaseFetch } from '@/lib/supabase/client'

export function createAdminClient() {
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/rest\/v1\/?$/i, '')
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase admin environment variables')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    global: {
      fetch: createSupabaseFetch(6000),
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
