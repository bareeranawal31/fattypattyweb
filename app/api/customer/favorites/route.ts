import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { User } from '@supabase/supabase-js'

interface FavoriteBody {
  menu_item_id?: string
}

async function getUserContext(request: Request): Promise<{ user: User | null }> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (!error && user) {
    return { user }
  }

  const authHeader = request.headers.get('authorization') || ''
  const hasBearer = authHeader.toLowerCase().startsWith('bearer ')
  if (!hasBearer) {
    return { user: null }
  }

  const token = authHeader.slice(7).trim()
  if (!token) {
    return { user: null }
  }

  try {
    const admin = createAdminClient()
    const { data, error: tokenError } = await admin.auth.getUser(token)
    if (tokenError) {
      console.warn('Favorites auth token validation failed:', tokenError.message)
      return { user: null }
    }
    return { user: data.user || null }
  } catch (tokenResolutionError) {
    console.warn('Favorites auth token resolution threw:', tokenResolutionError)
    return { user: null }
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { user } = await getUserContext(request)
    if (!user) {
      return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
    }

    let { data, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error && /column .* does not exist/i.test(error.message || '')) {
      const fallback = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', user.id)
      data = fallback.data
      error = fallback.error
    }

    if (error) throw error

    return NextResponse.json({ data: data || [], error: null })
  } catch (error) {
    console.error('Error loading favorites:', error)
    return NextResponse.json({ data: [], error: 'Failed to load favorites' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { user } = await getUserContext(request)
    if (!user) {
      return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as FavoriteBody
    const menuItemId = (body.menu_item_id || '').trim()
    if (!menuItemId) {
      return NextResponse.json({ data: null, error: 'menu_item_id is required' }, { status: 400 })
    }

    const { data: existing, error: existingError } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', user.id)
      .eq('menu_item_id', menuItemId)
      .maybeSingle()

    if (existingError) throw existingError

    if (existing) {
      return NextResponse.json({ data: existing, error: null })
    }

    const { data, error } = await supabase
      .from('favorites')
      .insert({
        user_id: user.id,
        menu_item_id: menuItemId,
      })
      .select('*')
      .single()

    if (error) throw error

    return NextResponse.json({ data, error: null })
  } catch (error) {
    console.error('Error creating favorite:', error)
    const message = error instanceof Error ? error.message : 'Failed to add favorite'
    return NextResponse.json({ data: null, error: message }, { status: 500 })
  }
}
