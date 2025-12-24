import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Check if we're in a build context where DATABASE_URL might not be available
const isBuildContext = process.env.NEXT_PHASE === 'phase-production-build'

// Only create PrismaClient if we have DATABASE_URL or we're not in build context
// During build without DATABASE_URL, we'll create a client that won't connect
const shouldCreateClient = !isBuildContext || !!process.env.DATABASE_URL

if (!shouldCreateClient) {
  // During build without DATABASE_URL, we still need to export something
  // but it will fail gracefully when methods are called
  console.warn('⚠️  Building without DATABASE_URL - database operations will be unavailable')
}

export const prisma = globalForPrisma.prisma ?? (shouldCreateClient ? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'file:./dev.db', // Fallback URL that won't be used if DATABASE_URL is missing
    },
  },
}) : (() => {
  // Create a minimal mock client for build time
  // This will throw errors if actually used, but won't cause build failures
  const mockClient = {
    $connect: async () => {},
    $disconnect: async () => {},
    $on: () => {},
    $use: () => {},
  } as any
  
  // Add all Prisma model methods as no-ops that throw helpful errors
  const models = ['product', 'productContent', 'trendSignal', 'review', 'productMetadata', 'productQuestion']
  for (const model of models) {
    mockClient[model] = {
      findMany: async () => { throw new Error('Database not available during build') },
      findUnique: async () => { throw new Error('Database not available during build') },
      findFirst: async () => { throw new Error('Database not available during build') },
      create: async () => { throw new Error('Database not available during build') },
      update: async () => { throw new Error('Database not available during build') },
      delete: async () => { throw new Error('Database not available during build') },
      upsert: async () => { throw new Error('Database not available during build') },
      count: async () => { throw new Error('Database not available during build') },
      updateMany: async () => { throw new Error('Database not available during build') },
      deleteMany: async () => { throw new Error('Database not available during build') },
      createMany: async () => { throw new Error('Database not available during build') },
    }
  }
  
  return mockClient as PrismaClient
})())

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

