import { NextResponse } from 'next/server'
import { authFunction } from '@/app/api/auth/[...nextauth]/route'

/**
 * Check if user is authenticated
 * Returns null if authenticated, or an error response if not
 * 
 * Usage:
 * const authError = await requireAuth()
 * if (authError) return authError
 */
export async function requireAuth() {
  const session = await authFunction()
  
  if (!session) {
    return NextResponse.json(
      { 
        error: 'Unauthorized', 
        message: 'You must be logged in to perform this action' 
      },
      { status: 401 }
    )
  }
  
  return null // User is authenticated
}

/**
 * Get the current session
 * Returns the session object if authenticated, or null if not
 * 
 * Usage:
 * const session = await getSession()
 * if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 */
export async function getSession() {
  const session = await authFunction()
  return session
}

/**
 * Check if user has admin role
 * Returns null if user is admin, or an error response if not
 * 
 * Usage:
 * const authError = await requireAdmin()
 * if (authError) return authError
 */
export async function requireAdmin() {
  const session = await authFunction()
  
  if (!session) {
    return NextResponse.json(
      { 
        error: 'Unauthorized', 
        message: 'You must be logged in to perform this action' 
      },
      { status: 401 }
    )
  }
  
  // Check if user has admin role
  const userRole = (session.user as any)?.role || 'user'
  if (userRole !== 'admin') {
    return NextResponse.json(
      { 
        error: 'Forbidden', 
        message: 'Admin access required' 
      },
      { status: 403 }
    )
  }
  
  return null // User is admin
}

