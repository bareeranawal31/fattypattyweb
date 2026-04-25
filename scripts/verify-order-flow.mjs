import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

function loadEnv() {
  for (const file of ['.env.local', 'supabase.env.local']) {
    const full = path.join(process.cwd(), file)
    if (!fs.existsSync(full)) continue
    for (const line of fs.readFileSync(full, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/)
      if (!m) continue
      if (!process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim()
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRole) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(url, serviceRole)
}

async function tableExists(supabase, tableName) {
  const { error } = await supabase.from(tableName).select('*').limit(1)
  if (!error) return { exists: true, error: null }
  const missing = /relation .* does not exist|Could not find the table/i.test(error.message || '')
  return { exists: !missing, error: missing ? null : error.message }
}

async function hasColumns(supabase, tableName, columns) {
  const { error } = await supabase.from(tableName).select(columns.join(',')).limit(1)
  if (!error) return { ok: true, error: null }
  return { ok: false, error: error.message }
}

async function run() {
  const supabase = loadEnv()

  const required = {
    users: ['id', 'name', 'email', 'phone', 'address', 'loyalty_points', 'created_at'],
    orders: ['id', 'user_id', 'created_at'],
    order_items: ['id', 'order_id', 'quantity', 'price'],
  }

  const tables = {}
  for (const table of Object.keys(required)) {
    tables[table] = await tableExists(supabase, table)
  }

  const columns = {}
  for (const [table, cols] of Object.entries(required)) {
    if (!tables[table].exists) {
      columns[table] = { ok: false, error: 'table missing' }
      continue
    }
    columns[table] = await hasColumns(supabase, table, cols)
  }

  const [{ count: withUserId }, { count: withoutUserId }] = await Promise.all([
    supabase.from('orders').select('*', { count: 'exact', head: true }).not('user_id', 'is', null),
    supabase.from('orders').select('*', { count: 'exact', head: true }).is('user_id', null),
  ])

  const { data: sampleOrders } = await supabase
    .from('orders')
    .select('id,order_number,user_id,customer_email,created_at,total,status')
    .order('created_at', { ascending: false })
    .limit(5)

  console.log(
    JSON.stringify(
      {
        tables,
        columns,
        linkage: {
          withUserId: withUserId || 0,
          withoutUserId: withoutUserId || 0,
        },
        sampleOrders: sampleOrders || [],
      },
      null,
      2,
    ),
  )
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
