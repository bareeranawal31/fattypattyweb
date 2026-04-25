import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { User } from '@supabase/supabase-js'

async function resolveRequestUser(request: Request): Promise<User | null> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (!error && user) {
    return user
  }

  const authHeader = request.headers.get('authorization') || ''
  const hasBearer = authHeader.toLowerCase().startsWith('bearer ')
  if (!hasBearer) {
    return null
  }

  const token = authHeader.slice(7).trim()
  if (!token) {
    return null
  }

  try {
    const admin = createAdminClient()
    const { data, error: tokenError } = await admin.auth.getUser(token)
    if (tokenError) {
      console.warn('Favorites delete token validation failed:', tokenError.message)
      return null
    }
    return data.user || null
  } catch (tokenResolutionError) {
    console.warn('Favorites delete token resolution threw:', tokenResolutionError)
    return null
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ menuItemId: string }> },
) {
  try {
    const { menuItemId } = await params
    const supabase = await createClient()
    const user = await resolveRequestUser(request)

    if (!user) {
      return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('menu_item_id', menuItemId)

    if (error) throw error

    return NextResponse.json({ data: { menu_item_id: menuItemId }, error: null })
  } catch (error) {
    console.error('Error deleting favorite:', error)
    const message = error instanceof Error ? error.message : 'Failed to delete favorite'
    return NextResponse.json({ data: null, error: message }, { status: 500 })
  }
}
