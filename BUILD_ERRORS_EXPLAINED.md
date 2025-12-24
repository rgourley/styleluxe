# Why We Had Constant Build Errors - Root Cause Analysis

## The Problem

We kept getting build errors like:
```
Error: Failed to collect page data for /api/...
```

## Root Cause

The issue was a **cascade of top-level imports** that executed during Next.js build:

1. **PrismaClient Creation**: `lib/prisma.ts` was creating a `PrismaClient` instance at the **top level** (module evaluation time)
2. **Lib File Imports**: Multiple lib files imported prisma at the top level:
   - `lib/generate-content.ts`
   - `lib/trending-products.ts`
   - `lib/products.ts`
   - `lib/db-check.ts`
3. **Route Imports**: API routes imported these lib files (even if lazily)
4. **Build Analysis**: Next.js analyzes all imports during build, which triggered PrismaClient creation
5. **Database Connection**: PrismaClient tried to connect to the database during build, which failed when `DATABASE_URL` wasn't available

## Why It Kept Happening

Every time we fixed one route, another route would fail because:
- The fix was reactive (fixing routes one by one)
- The root cause (top-level PrismaClient creation) wasn't addressed
- New routes would import lib files that imported prisma
- Build analysis would still trigger the connection attempt

## The Solution

We implemented **lazy initialization with a Proxy**:

1. **Proxy Pattern**: `prisma` is now a Proxy that only creates the PrismaClient when a method is actually called
2. **Build-Safe Mock**: During build without `DATABASE_URL`, returns a mock client with no-op methods
3. **Runtime Client**: At runtime, creates the real PrismaClient when first accessed
4. **No Top-Level Execution**: PrismaClient is never created during module evaluation

## Key Changes

### Before (Problematic):
```typescript
// lib/prisma.ts
export const prisma = new PrismaClient({ ... }) // ❌ Created at module load
```

### After (Fixed):
```typescript
// lib/prisma.ts
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient() // ✅ Only created when accessed
    return client[prop]
  },
})
```

## Prevention Strategy

1. **Never create PrismaClient at top level** - Always use lazy initialization
2. **Use Proxy pattern** - Defer client creation until actually needed
3. **Build-safe mocks** - Return no-op clients during build phase
4. **Lazy imports in routes** - Use `await import()` for lib files that use prisma
5. **Automated checks** - Run `npm run check:api-routes` before building

## Why This Works

- **Build Time**: Proxy returns mock client, no database connection attempted
- **Runtime**: Proxy creates real client on first method call, works normally
- **Type Safety**: TypeScript still sees it as PrismaClient
- **Performance**: Client is cached after first creation (singleton pattern)

## Testing

Always test builds locally:
```bash
npm run build
```

If build fails, check:
1. Are there any top-level PrismaClient creations?
2. Are lib files importing prisma at top level?
3. Are routes using lazy imports for lib files?

## Summary

The constant build errors were caused by **eager PrismaClient initialization**. The solution is **lazy initialization via Proxy**, which ensures the client is only created when actually needed, not during build analysis.

