import { authFunction } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'

/**
 * Get the current session on the server side
 */
export async function getSession() {
  return await authFunction()
}

/**
 * Require authentication - redirects to login if not authenticated
 */
export async function requireAuth() {
  const session = await getSession()
  
  if (!session) {
    redirect('/admin/login')
  }
  
  return session
}

/**
 * Require admin role - redirects to login if not admin
 */
export async function requireAdmin() {
  const session = await requireAuth()
  
  const userRole = (session.user as any)?.role
  
  if (userRole !== 'admin' && userRole !== 'editor') {
    redirect('/admin/login')
  }
  
  return session
}
