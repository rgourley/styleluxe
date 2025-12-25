export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Auth is handled by middleware.ts
  return <>{children}</>
}

