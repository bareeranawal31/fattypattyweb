import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function getSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

interface ReplyBody {
  adminReply?: string
  status?: 'open' | 'answered' | 'closed'
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = (await request.json()) as ReplyBody

    const adminReply = body.adminReply?.trim() || ''
    const status = body.status || 'answered'

    if (!adminReply) {
      return NextResponse.json({ data: null, error: 'Reply is required' }, { status: 400 })
    }

    const supabase = getSupabase()

    const { data, error } = await supabase
      .from('support_tickets')
      .update({
        admin_reply: adminReply,
        status,
        reply_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ data, error: null })
  } catch (error) {
    console.error('Error updating support reply:', error)
    return NextResponse.json({ data: null, error: 'Failed to save reply' }, { status: 500 })
  }
}
