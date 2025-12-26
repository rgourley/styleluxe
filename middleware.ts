import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  // Only protect admin routes (but not the login page itself)
  if (request.nextUrl.pathname.startsWith('/admin') && 
      !request.nextUrl.pathname.startsWith('/admin/login')) {
    
    // Use NextAuth's getToken to properly validate the JWT
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    })
    
    if (!token) {
      // No valid token, redirect to login
      const url = new URL('/admin/login', request.url)
      url.searchParams.set('callbackUrl', request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }
    
    // Token is valid - let it through
    return NextResponse.next()
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
