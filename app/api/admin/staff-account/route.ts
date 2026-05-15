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
    name: String(row.name || row.user_metadata?.name || '').trim(),
    email: String(row.email || '').trim().toLowerCase(),
    isActive: row.is_active ?? row.isActive ?? row.user_metadata?.isActive ?? true,
    updatedAt: row.updated_at ?? row.updatedAt ?? row.created_at ?? row.createdAt ?? null,
    createdAt: row.created_at ?? row.createdAt ?? null,
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

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ data: null, error: 'Supabase is not configured' }, { status: 503 })
    }

    const supabase = getSupabase()

    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (error) throw error

    const staffUser = (data.users || []).find((user) => {
      const metadata = (user.user_metadata || {}) as Record<string, unknown>
      return metadata.role === 'staff'
    })

    return NextResponse.json({ data: staffUser ? normalizeAuthUser(staffUser as Record<string, unknown>) : null }, { status: 200 })
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
    const existingUser = await findStaffAuthUserByEmail(supabase, originalEmail)

    if (password.trim() && password.trim().length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const metadata = {
      role: 'staff',
      name,
      isActive,
    }

    if (existingUser) {
      const updatePayload: Record<string, unknown> = {
        email,
        user_metadata: metadata,
      }

      if (password.trim()) {
        updatePayload.password = password.trim()
      }

      const { data, error } = await supabase.auth.admin.updateUserById(existingUser.id, updatePayload)
      if (error) throw error

      return NextResponse.json({ data: normalizeAuthUser(data as Record<string, unknown>) }, { status: 200 })
    }

    if (!password.trim()) {
      return NextResponse.json({ error: 'Password is required for a new staff account' }, { status: 400 })
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: password.trim(),
      email_confirm: true,
      user_metadata: metadata,
    })

    if (error) throw error

    return NextResponse.json({ data: normalizeAuthUser(data.user as Record<string, unknown>) }, { status: 200 })
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
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) throw error

    const metadata = (data.user?.user_metadata || {}) as Record<string, unknown>
    if (metadata.role !== 'staff') {
      return NextResponse.json({ error: 'Invalid staff credentials' }, { status: 401 })
    }

    if (metadata.isActive === false) {
      return NextResponse.json({ error: 'Staff account not configured or inactive' }, { status: 401 })
    }

    return NextResponse.json({
      data: {
        name: String(metadata.name || data.user?.email || ''),
        role: 'staff',
        email: String(data.user?.email || email),
        loginTime: new Date().toISOString(),
      },
    }, { status: 200 })
  } catch (error) {
    console.error('[staff-account] Error verifying staff login:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to verify staff login' }, { status: 500 })
  }
}
