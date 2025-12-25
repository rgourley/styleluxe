import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth-helper'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Require admin authentication for all admin routes
  await requireAdmin()
  
  return <>{children}</>
}

