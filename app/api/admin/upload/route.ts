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

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { data: null, error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { data: null, error: 'Only image files are allowed' },
        { status: 400 }
      )
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { data: null, error: 'Image size must be less than 5MB' },
        { status: 400 }
      )
    }

    // Create a unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `menu-items/${fileName}`

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    try {
      const supabase = getSupabase()

      // Upload to Supabase Storage
      const { error } = await supabase.storage
        .from('images')
        .upload(filePath, buffer, {
          contentType: file.type,
          upsert: false,
        })

      if (error) {
        throw error
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(filePath)

      return NextResponse.json({
        data: { url: urlData.publicUrl },
        error: null,
      })
    } catch (storageError) {
      console.warn('Supabase storage unavailable, using inline data URL fallback:', storageError)
      const base64 = Buffer.from(arrayBuffer).toString('base64')
      const inlineImageUrl = `data:${file.type};base64,${base64}`

      return NextResponse.json({
        data: { url: inlineImageUrl, _fallback: true },
        error: null,
      })
    }
  } catch (error) {
    console.error('Error uploading file:', error)
    const message = error instanceof Error ? error.message : 'Failed to upload file'
    return NextResponse.json(
      { data: null, error: message },
      { status: 500 }
    )
  }
}
