import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  const raw = fs.readFileSync(filePath, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx < 1) continue
    const key = trimmed.slice(0, idx).trim()
    const value = trimmed.slice(idx + 1).trim()
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

function resolveEnv() {
  const cwd = process.cwd()
  loadEnvFile(path.join(cwd, '.env.local'))
  loadEnvFile(path.join(cwd, 'supabase.env.local'))

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRole) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return { url, serviceRole }
}

async function ensureUsersRow(supabase, authUser) {
  const payloads = [
    {
      id: authUser.id,
      email: authUser.email || '',
      name: authUser.user_metadata?.full_name || null,
      phone: authUser.user_metadata?.phone || null,
      loyalty_points: 0,
      is_active: true,
    },
    {
      id: authUser.id,
      email: authUser.email || '',
      name: authUser.user_metadata?.full_name || null,
      phone: authUser.user_metadata?.phone || null,
      loyalty_points: 0,
    },
    {
      id: authUser.id,
      email: authUser.email || '',
      name: authUser.user_metadata?.full_name || null,
      phone: authUser.user_metadata?.phone || null,
    },
    {
      id: authUser.id,
      email: authUser.email || '',
      name: authUser.user_metadata?.full_name || null,
    },
    {
      id: authUser.id,
      email: authUser.email || '',
    },
  ]

  for (const payload of payloads) {
    const { error } = await supabase.from('users').upsert(payload, { onConflict: 'id' })
    if (!error) return null
    if (!/Could not find the '.*' column/.test(error.message || '')) {
      return error
    }
  }

  return new Error(`Unable to upsert users row for auth user ${authUser.id}`)
}

async function main() {
  const apply = process.argv.includes('--apply')
  const { url, serviceRole } = resolveEnv()
  const supabase = createClient(url, serviceRole)

  const { data: authResult, error: authError } = await supabase.auth.admin.listUsers()
  if (authError) throw authError

  const authUsers = authResult?.users || []
  const byEmail = new Map(
    authUsers
      .filter((u) => u.email)
      .map((u) => [u.email.toLowerCase().trim(), u]),
  )

  const { data: nullOrders, error: ordersError } = await supabase
    .from('orders')
    .select('id,order_number,customer_email,user_id')
    .is('user_id', null)

  if (ordersError) throw ordersError

  const candidates = []
  for (const order of nullOrders || []) {
    const email = (order.customer_email || '').toLowerCase().trim()
    if (!email) continue
    const authUser = byEmail.get(email)
    if (!authUser) continue
    candidates.push({ order, authUser })
  }

  console.log(JSON.stringify({
    mode: apply ? 'apply' : 'dry-run',
    nullUserOrders: (nullOrders || []).length,
    authUsers: authUsers.length,
    matchableOrders: candidates.length,
    matches: candidates.map((x) => ({
      orderId: x.order.id,
      orderNumber: x.order.order_number,
      customerEmail: x.order.customer_email,
      authUserId: x.authUser.id,
    })),
  }, null, 2))

  if (!apply || candidates.length === 0) {
    return
  }

  let ensuredUsersRows = 0
  let updatedOrders = 0

  for (const { order, authUser } of candidates) {
    const ensureError = await ensureUsersRow(supabase, authUser)
    if (ensureError) {
      console.warn(`Skipping ${order.order_number}: could not ensure users row: ${ensureError.message}`)
      continue
    }
    ensuredUsersRows += 1

    const { error: updateError } = await supabase
      .from('orders')
      .update({ user_id: authUser.id })
      .eq('id', order.id)
      .is('user_id', null)

    if (updateError) {
      console.warn(`Skipping ${order.order_number}: order update failed: ${updateError.message}`)
      continue
    }
    updatedOrders += 1
  }

  console.log(JSON.stringify({
    mode: 'apply-result',
    ensuredUsersRows,
    updatedOrders,
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
