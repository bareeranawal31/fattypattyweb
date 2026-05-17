import { createClient } from '@supabase/supabase-js'
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseServiceKey && supabaseUrl.startsWith('http') && supabaseServiceKey.length > 20)
}

function getSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured')
  }
  return createClient(supabaseUrl!, supabaseServiceKey!)
}

interface StaffAccountRow {
  id: string
  name: string
  email: string
  password_hash: string
  is_active: boolean
  updated_at: string | null
  created_at: string | null
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

function verifyPassword(password: string, storedHash: string) {
  const [salt, hash] = storedHash.split(':')
  if (!salt || !hash) return false

  const derived = scryptSync(password, salt, 64)
  const stored = Buffer.from(hash, 'hex')
  return stored.length === derived.length && timingSafeEqual(stored, derived)
}

function normalizeStaffAccount(row: Record<string, unknown>) {
  return {
    id: String(row.id || ''),
    name: String(row.name || '').trim(),
    email: String(row.email || '').trim().toLowerCase(),
    isActive: row.is_active ?? row.isActive ?? true,
    updatedAt: String(row.updated_at ?? row.updatedAt ?? row.created_at ?? row.createdAt ?? ''),
    createdAt: String(row.created_at ?? row.createdAt ?? ''),
  }
}

function normalizeAuthUser(user: Record<string, unknown>) {
  const metadata = (user.user_metadata || {}) as Record<string, unknown>

  return {
    id: String(user.id || ''),
    name: String(metadata.name || user.email || '').trim(),
    email: String(user.email || '').trim().toLowerCase(),
    isActive: metadata.isActive ?? true,
    updatedAt: String(user.updated_at || user.created_at || new Date().toISOString()),
    createdAt: String(user.created_at || new Date().toISOString()),
  }
}

async function findStaffAuthUserByEmail(supabase: ReturnType<typeof getSupabase>, email: string) {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) throw error

  const matched = (data.users || []).find((user) => {
    const metadata = (user.user_metadata || {}) as Record<string, unknown>
    return user.email?.toLowerCase() === email.toLowerCase() && metadata.role === 'staff'
  })

  return matched || null
}

async function getLatestStaffAccount(supabase: ReturnType<typeof getSupabase>) {
  const { data, error } = await supabase
    .from('staff_accounts')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)

  if (error) throw error
  const row = data?.[0] as StaffAccountRow | undefined
  return row || null
}

async function findStaffAccountByEmail(supabase: ReturnType<typeof getSupabase>, email: string) {
  const { data, error } = await supabase
    .from('staff_accounts')
    .select('*')
    .eq('email', email.toLowerCase())
    .maybeSingle()

  if (error) throw error
  return (data as StaffAccountRow | null) || null
}

async function upsertStaffAccount(
  supabase: ReturnType<typeof getSupabase>,
  payload: {
    name: string
    email: string
    passwordHash: string
    isActive: boolean
    originalEmail: string
  },
) {
  const normalizedEmail = payload.email.toLowerCase()
  const normalizedOriginalEmail = payload.originalEmail.toLowerCase()

  // Verify staff_accounts table exists
  try {
    const { error: tableCheckError } = await supabase
      .from('staff_accounts')
      .select('id')
      .limit(1)
    
    if (tableCheckError?.code === 'PGRST116' || tableCheckError?.message?.includes('does not exist') || tableCheckError?.message?.includes('relation')) {
      console.error('[staff-account] staff_accounts table missing', tableCheckError)
      throw new Error(
        'Staff accounts table not found in database. Please run: ' +
        'CREATE TABLE IF NOT EXISTS public.staff_accounts (' +
        'id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ' +
        'name text NOT NULL, ' +
        'email text NOT NULL UNIQUE, ' +
        'password_hash text NOT NULL, ' +
        'is_active boolean DEFAULT true, ' +
        'created_at timestamptz DEFAULT NOW(), ' +
        'updated_at timestamptz DEFAULT NOW()' +
        ')'
      )
    }
  } catch (e) {
    if (e instanceof Error && !e.message.includes('table not found')) {
      throw e
    }
  }

  if (normalizedOriginalEmail !== normalizedEmail) {
    const existingWithTargetEmail = await findStaffAccountByEmail(supabase, normalizedEmail)
    if (existingWithTargetEmail) {
      throw new Error('A staff account with this email already exists')
    }
  }

  const existing = await findStaffAccountByEmail(supabase, normalizedOriginalEmail)

  if (existing) {
    const { data, error } = await supabase
      .from('staff_accounts')
      .update({
        name: payload.name,
        email: normalizedEmail,
        password_hash: payload.passwordHash,
        is_active: payload.isActive,
      })
      .eq('id', existing.id)
      .select('*')
      .single()

    if (error) throw error
    return data as StaffAccountRow
  }

  const { data, error } = await supabase
    .from('staff_accounts')
    .insert({
      name: payload.name,
      email: normalizedEmail,
      password_hash: payload.passwordHash,
      is_active: payload.isActive,
    })
    .select('*')
    .single()

  if (error) throw error
  return data as StaffAccountRow
}

async function tryMigrateLegacyAuthStaff(
  supabase: ReturnType<typeof getSupabase>,
  email: string,
  password: string,
) {
  const authUser = await findStaffAuthUserByEmail(supabase, email)
  if (!authUser) {
    return null
  }

  const signIn = await supabase.auth.signInWithPassword({ email, password })
  if (signIn.error || !signIn.data.user) {
    return null
  }

  const metadata = (signIn.data.user.user_metadata || {}) as Record<string, unknown>
  if (metadata.role !== 'staff' || metadata.isActive === false) {
    return null
  }

  const migrated = await upsertStaffAccount(supabase, {
    name: String(metadata.name || signIn.data.user.email || 'Staff').trim(),
    email,
    originalEmail: email,
    passwordHash: hashPassword(password),
    isActive: true,
  })

  return migrated
}

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ data: null, error: 'Supabase is not configured' }, { status: 503 })
    }

    const supabase = getSupabase()

    const staffAccount = await getLatestStaffAccount(supabase)

    if (staffAccount) {
      return NextResponse.json({ data: normalizeStaffAccount(staffAccount as unknown as Record<string, unknown>) }, { status: 200 })
    }

    // Legacy fallback for old installations where only auth.users has staff profile.
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (error) throw error

    const staffUser = (data.users || []).find((user) => {
      const metadata = (user.user_metadata || {}) as Record<string, unknown>
      return metadata.role === 'staff'
    })

    return NextResponse.json({ data: staffUser ? normalizeAuthUser(staffUser as unknown as Record<string, unknown>) : null }, { status: 200 })
  } catch (error) {
    console.error('[staff-account] Error loading staff account:', error)
    return NextResponse.json({ data: null, error: error instanceof Error ? error.message : 'Failed to load staff account' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 })
    }

    const body = await request.json()
    const name = String(body.name || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    const isActive = body.isActive !== false
    const password = String(body.password || '')
    const originalEmail = String(body.originalEmail || email).trim().toLowerCase()

    if (!name) {
      return NextResponse.json({ error: 'Staff name is required' }, { status: 400 })
    }
    if (!email) {
      return NextResponse.json({ error: 'Staff email is required' }, { status: 400 })
    }

    const supabase = getSupabase()
    if (password.trim() && password.trim().length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const existingStaff = await findStaffAccountByEmail(supabase, originalEmail)

    if (!existingStaff && !password.trim()) {
      return NextResponse.json({ error: 'Password is required for a new staff account' }, { status: 400 })
    }

    const passwordHash = password.trim()
      ? hashPassword(password.trim())
      : String(existingStaff?.password_hash || '')

    if (!passwordHash) {
      return NextResponse.json({ error: 'Password is required for a new staff account' }, { status: 400 })
    }

    const stored = await upsertStaffAccount(supabase, {
      name,
      email,
      originalEmail,
      isActive,
      passwordHash,
    })

    return NextResponse.json({ data: normalizeStaffAccount(stored as unknown as Record<string, unknown>) }, { status: 200 })
  } catch (error) {
    console.error('[staff-account] Error saving staff account:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to save staff account' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 })
    }

    const body = await request.json()
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const supabase = getSupabase()

    // Verify table exists before attempting lookup
    try {
      const { error: tableCheckError } = await supabase
        .from('staff_accounts')
        .select('id')
        .limit(1)
      
      if (tableCheckError?.code === 'PGRST116' || tableCheckError?.message?.includes('does not exist')) {
        console.error('[staff-account] staff_accounts table missing during login', tableCheckError)
        return NextResponse.json(
          { 
            error: 'Staff account system not set up. Admin must create staff credentials first. Contact your administrator.' 
          }, 
          { status: 503 }
        )
      }
    } catch (e) {
      console.error('[staff-account] Error checking staff_accounts table', e)
    }

    let account = await findStaffAccountByEmail(supabase, email)

    if (!account) {
      // Migrate old auth-based staff account on first successful login.
      account = await tryMigrateLegacyAuthStaff(supabase, email, password)
    }

    if (!account) {
      console.warn(`[staff-account] Login attempt with non-existent email: ${email}`)
      return NextResponse.json({ error: 'Invalid staff credentials - account not found' }, { status: 401 })
    }

    if (!account.is_active) {
      console.warn(`[staff-account] Login attempt on inactive account: ${email}`)
      return NextResponse.json({ error: 'Staff account is inactive. Contact your administrator.' }, { status: 401 })
    }

    const isValidPassword = verifyPassword(password, account.password_hash)
    if (!isValidPassword) {
      console.warn(`[staff-account] Failed password verification for email: ${email}`)
      return NextResponse.json({ error: 'Invalid staff credentials - wrong password' }, { status: 401 })
    }

    console.log(`[staff-account] Successful login for staff: ${email}`)
    return NextResponse.json({
      data: {
        name: String(account.name || account.email),
        role: 'staff',
        email: String(account.email),
        loginTime: new Date().toISOString(),
      },
    }, { status: 200 })
  } catch (error) {
    console.error('[staff-account] Error verifying staff login:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to verify staff login' }, { status: 500 })
  }
}
