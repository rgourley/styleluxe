import { NextResponse } from 'next/server'

/**
 * Image upload handler for serverless environments
 * Converts images to base64 data URLs for storage in database
 * Works in Vercel and other serverless platforms where filesystem is read-only
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, message: 'File must be an image' },
        { status: 400 }
      )
    }

    // Validate file size (max 2MB for base64 to keep database reasonable)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: 'File size must be less than 2MB' },
        { status: 400 }
      )
    }

    // Convert file to base64 data URL
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString('base64')
    const dataUrl = `data:${file.type};base64,${base64}`

    // Return data URL (can be stored directly in database)
    return NextResponse.json({
      success: true,
      url: dataUrl,
      filename: file.name,
      type: file.type,
      size: file.size,
    })
  } catch (error) {
    console.error('Image upload error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}






