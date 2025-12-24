import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Lazy initialization function to prevent build-time database connection
function getPrismaClient(): PrismaClient {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma
  }

  // Check if we're in a build context (Next.js build phase)
  const isBuildContext = process.env.NEXT_PHASE === 'phase-production-build' || 
                         (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL)

  if (isBuildContext) {
    // During build, return a mock client that won't try to connect
    // This prevents build errors when DATABASE_URL is not available
    const mockClient = {} as PrismaClient
    return mockClient
  }

  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️  DATABASE_URL is not set. Database operations will fail.')
  }

  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client
  }

  return client
}

// Export a getter that lazily initializes the client
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient()
    return (client as any)[prop]
  },
})

