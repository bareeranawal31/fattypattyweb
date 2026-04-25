import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { branches as fallbackBranches } from '@/lib/service-areas'

const DNS_BACKOFF_MS = 5 * 60 * 1000

let dnsFailureUntil = 0
let lastDnsLogAt = 0

function getFallbackBranches() {
  return fallbackBranches.map((branch) => ({
    ...branch,
    latitude: null,
    longitude: null,
    delivery_radius: null,
    is_active: true,
    delivery_areas: [],
  }))
}

function isDnsFailure(error: unknown): boolean {
  const message = String((error as { message?: string })?.message || error || '')
  const details = String((error as { details?: string })?.details || '')
  return /ENOTFOUND|getaddrinfo/i.test(`${message}\n${details}`)
}

function markDnsFailure(error: unknown) {
  if (!isDnsFailure(error)) return

  dnsFailureUntil = Date.now() + DNS_BACKOFF_MS
  const now = Date.now()
  if (now - lastDnsLogAt > 60_000) {
    lastDnsLogAt = now
    console.warn('[branches API] Supabase DNS lookup failed. Using fallback data for 5 minutes.')
  }
}

function shouldUseDnsFallback() {
  return Date.now() < dnsFailureUntil
}

export async function GET() {
  if (shouldUseDnsFallback()) {
    return NextResponse.json({
      data: getFallbackBranches(),
      error: null,
      _fallback: true,
    })
  }

  try {
    const supabase = await createClient()

    const { data: branches, error } = await supabase
      .from('branches')
      .select(`
        *,
        delivery_areas (*)
      `)
      .eq('is_active', true)
      .order('name')

    if (error) {
      markDnsFailure(error)
      if (!isDnsFailure(error)) {
        console.warn('Falling back to static branches:', error.message)
      }
      return NextResponse.json({
        data: getFallbackBranches(),
        error: null,
        _fallback: true,
      })
    }

    return NextResponse.json({
      data: branches,
      error: null,
    })
  } catch (error) {
    markDnsFailure(error)
    if (!isDnsFailure(error)) {
      console.error('Error fetching branches:', error)
    }
    return NextResponse.json({
      data: getFallbackBranches(),
      error: null,
      _fallback: true,
    })
  }
}
