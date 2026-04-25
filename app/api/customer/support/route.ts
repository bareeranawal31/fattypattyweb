import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface CreateTicketBody {
  subject?: string
  message?: string
  ticketType?: 'query' | 'complaint' | 'request'
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ data, error: null })
  } catch (error) {
    console.error('Error fetching customer support tickets:', error)
    return NextResponse.json(
      { data: null, error: 'Failed to fetch support tickets' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as CreateTicketBody
    const subject = body.subject?.trim() || ''
    const message = body.message?.trim() || ''
    const ticketType = body.ticketType || 'query'

    if (!subject || !message) {
      return NextResponse.json(
        { data: null, error: 'Subject and message are required' },
        { status: 400 },
      )
    }

    const { data, error } = await supabase
      .from('support_tickets')
      .insert({
        customer_id: user.id,
        customer_email: user.email || '',
        customer_name: (user.user_metadata?.full_name as string | undefined) || null,
        subject,
        message,
        ticket_type: ticketType,
      })
      .select('*')
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ data, error: null })
  } catch (error) {
    console.error('Error creating support ticket:', error)
    return NextResponse.json({ data: null, error: 'Failed to submit support request' }, { status: 500 })
  }
}
