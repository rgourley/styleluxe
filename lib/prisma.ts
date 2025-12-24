import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// LAZY INITIALIZATION: Only create PrismaClient when actually accessed
// This prevents build-time database connection attempts
let _prisma: PrismaClient | undefined = undefined

function getPrismaClient(): PrismaClient {
  // Return cached instance if available
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma
  }
  
  if (_prisma) {
    return _prisma
  }

  // Check if we're in a build context
  const isBuildContext = process.env.NEXT_PHASE === 'phase-production-build'
  const hasDatabaseUrl = !!process.env.DATABASE_URL

  // During build without DATABASE_URL, create a no-op mock client
  if (isBuildContext && !hasDatabaseUrl) {
    const mockClient = {
      $connect: async () => {},
      $disconnect: async () => {},
      $on: () => {},
      $use: () => {},
      $queryRaw: async () => [],
      $executeRaw: async () => 0,
      $transaction: async (fn: any) => fn(mockClient),
    } as any
    
    // Add all Prisma model methods as no-ops
    const models = ['product', 'productContent', 'trendSignal', 'review', 'productMetadata', 'productQuestion']
    for (const model of models) {
      mockClient[model] = {
        findMany: async () => [],
        findUnique: async () => null,
        findFirst: async () => null,
        create: async () => ({}),
        update: async () => ({}),
        delete: async () => ({}),
        upsert: async () => ({}),
        count: async () => 0,
        updateMany: async () => ({ count: 0 }),
        deleteMany: async () => ({ count: 0 }),
        createMany: async () => ({ count: 0 }),
      }
    }
    
    _prisma = mockClient as PrismaClient
    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = _prisma
    }
    return _prisma
  }

  // Create real PrismaClient for runtime
  _prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'file:./dev.db',
      },
    },
  })

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = _prisma
  }

  return _prisma
}

// Export a Proxy that lazily initializes the client only when methods are called
// This ensures PrismaClient is never created during module evaluation (build time)
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient()
    const value = (client as any)[prop]
    
    // If it's a function, bind it to the client
    if (typeof value === 'function') {
      return value.bind(client)
    }
    
    return value
  },
})

