import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Don't protect admin routes in middleware - let the page handle it
  // This prevents redirect loops and cookie issues
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
