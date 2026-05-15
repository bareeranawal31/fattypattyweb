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
    id: row.id,
    name: String(row.name || '').trim(),
    email: String(row.email || '').trim().toLowerCase(),
    isActive: row.is_active ?? row.isActive ?? true,
    updatedAt: row.updated_at ?? row.updatedAt ?? null,
    createdAt: row.created_at ?? row.createdAt ?? null,
  }
}

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ data: null, error: 'Supabase is not configured' }, { status: 503 })
    }

    const supabase = getSupabase()
    const { data, error } = await supabase.from('staff_accounts').select('*').order('updated_at', { ascending: false }).limit(1).maybeSingle()

    if (error) throw error

    return NextResponse.json({ data: data ? normalizeStaffAccount(data as Record<string, unknown>) : null }, { status: 200 })
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

    if (!name) {
      return NextResponse.json({ error: 'Staff name is required' }, { status: 400 })
    }
    if (!email) {
      return NextResponse.json({ error: 'Staff email is required' }, { status: 400 })
    }

    const supabase = getSupabase()
    const { data: existingRow, error: fetchError } = await supabase
      .from('staff_accounts')
      .select('*')
      .eq('email', email)
      .maybeSingle()

    if (fetchError) throw fetchError

    const payload: Record<string, unknown> = {
      name,
      email,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    }

    if (password.trim()) {
      if (password.trim().length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
      }
      payload.password_hash = hashPassword(password.trim())
    } else if (!existingRow) {
      return NextResponse.json({ error: 'Password is required for a new staff account' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('staff_accounts')
      .upsert(payload, { onConflict: 'email' })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data: normalizeStaffAccount(data as Record<string, unknown>) }, { status: 200 })
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
    const { data, error } = await supabase
      .from('staff_accounts')
      .select('*')
      .eq('email', email)
      .maybeSingle()

    if (error) throw error

    if (!data || data.is_active === false) {
      return NextResponse.json({ error: 'Staff account not configured or inactive' }, { status: 401 })
    }

    const passwordHash = String((data as Record<string, unknown>).password_hash || '')
    if (!passwordHash || !verifyPassword(password, passwordHash)) {
      return NextResponse.json({ error: 'Invalid staff credentials' }, { status: 401 })
    }

    return NextResponse.json({
      data: {
        name: String((data as Record<string, unknown>).name || ''),
        role: 'staff',
        email,
        loginTime: new Date().toISOString(),
      },
    }, { status: 200 })
  } catch (error) {
    console.error('[staff-account] Error verifying staff login:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to verify staff login' }, { status: 500 })
  }
}
