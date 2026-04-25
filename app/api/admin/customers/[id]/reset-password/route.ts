import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

    const [{ data: customer, error: customerError }, { data: authCustomer, error: authCustomerError }] = await Promise.all([
      supabase
        .from('users')
        .select('email')
        .eq('id', id)
        .maybeSingle(),
      supabase.auth.admin.getUserById(id),
    ])

    if (customerError) throw customerError
    if (authCustomerError) throw authCustomerError

    const email = (customer?.email || authCustomer.user?.email || '') as string

    if (!email) {
      return NextResponse.json({ data: null, error: 'Customer email not found' }, { status: 404 })
    }

    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/customer/reset-password`,
      },
    })

    if (error) throw error

    return NextResponse.json({ data: { email, action_link: data.properties?.action_link || null }, error: null })
  } catch (error) {
    console.error('Error generating reset link:', error)
    return NextResponse.json({ data: null, error: 'Failed to generate password reset link' }, { status: 500 })
  }
}
