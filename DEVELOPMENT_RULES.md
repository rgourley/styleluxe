# Development Rules & Best Practices

This document outlines critical rules to prevent common errors and breaking changes.

## 🚨 Critical Rules

### 1. Prisma Query Structure

**NEVER** mix `OR` and `AND` at the same level in a `where` clause. Always nest them properly.

❌ **WRONG:**
```typescript
where: {
  status: 'PUBLISHED',
  OR: [...],
  AND: [...],  // ❌ This will cause errors
}
```

✅ **CORRECT:**
```typescript
where: {
  status: 'PUBLISHED',
  AND: [
    { OR: [...] },
    { OR: [...] },
  ],
}
```

**Rule:** Always wrap multiple conditions in a single `AND` array when you have both `OR` and `AND` conditions.

### 2. unstable_cache Usage

**NEVER** call `unstable_cache()` with `()()` directly. Always store the function first, then call it.

❌ **WRONG:**
```typescript
export async function getProducts() {
  return unstable_cache(
    async () => { ... },
    ['cache-key'],
    { revalidate: 60 }
  )()  // ❌ This can cause compilation issues
}
```

✅ **CORRECT:**
```typescript
export async function getProducts() {
  const cachedFn = unstable_cache(
    async () => { ... },
    ['cache-key'],
    { revalidate: 60 }
  )
  
  return cachedFn()  // ✅ Call separately
}
```

### 3. Testing Queries Before Deploying

**ALWAYS** test Prisma queries in isolation before using them in production code.

```typescript
// Create a test script: scripts/test-query.ts
import { prisma } from '../lib/prisma.js'

async function testQuery() {
  try {
    const result = await prisma.product.findMany({
      where: { /* your query */ },
      take: 5,
    })
    console.log('✅ Query works:', result.length)
  } catch (error) {
    console.error('❌ Query error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

testQuery()
```

Run with: `npx tsx scripts/test-query.ts`

### 4. Handling Null Values in Prisma

When querying for null values, use explicit `null` checks in `OR` clauses.

✅ **CORRECT:**
```typescript
where: {
  OR: [
    { currentScore: { gte: 50 } },
    { currentScore: null },  // ✅ Explicit null check
  ],
}
```

❌ **WRONG:**
```typescript
where: {
  currentScore: { gte: 50 },  // ❌ This excludes null values
}
```

### 5. Query Complexity

**AVOID** overly complex nested queries. Break them into multiple queries and combine in memory if needed.

✅ **BETTER:**
```typescript
const [products1, products2] = await Promise.all([
  prisma.product.findMany({ where: { condition1 } }),
  prisma.product.findMany({ where: { condition2 } }),
])
// Combine and deduplicate
```

### 6. TypeScript Compilation

**ALWAYS** check for TypeScript errors before committing:

```bash
npx tsc --noEmit
```

Or use the linter:
```bash
npm run lint
```

### 7. Server Restart After Query Changes

**ALWAYS** restart the dev server after making Prisma query changes:

```bash
# Kill existing server
pkill -f "next dev"

# Clear cache
rm -rf .next

# Restart
npm run dev
```

### 8. Database Query Timeouts

**ALWAYS** wrap database queries in `Promise.race` with a timeout to prevent hanging:

```typescript
const products = await Promise.race([
  prisma.product.findMany({ ... }),
  new Promise((resolve) => 
    setTimeout(() => {
      console.warn('⚠️ Query timeout')
      resolve([])
    }, 5000)
  )
])
```

### 9. Select vs Include

**PREFER** `include` over `select` unless you're optimizing for performance. `include` is safer and ensures all required fields are available.

✅ **SAFER:**
```typescript
include: {
  trendSignals: { take: 3 },
  reviews: { take: 5 },
  content: true,
}
```

⚠️ **OPTIMIZED (but risky):**
```typescript
select: {
  id: true,
  name: true,
  // Must list ALL fields that components need
  trendSignals: { select: { ... } },
}
```

### 10. Cache Clearing

**ALWAYS** clear Next.js cache after making query changes:

```bash
rm -rf .next
```

Or programmatically:
```typescript
// In development, you can use:
import { revalidateTag } from 'next/cache'
revalidateTag('products')
```

## 🔍 Debugging Checklist

Before reporting an error, check:

1. ✅ Prisma query structure (no mixed OR/AND at same level)
2. ✅ unstable_cache called correctly (stored then called)
3. ✅ Null values handled explicitly in queries
4. ✅ TypeScript compilation passes (`npx tsc --noEmit`)
5. ✅ Cache cleared (`.next` directory removed)
6. ✅ Server restarted after changes
7. ✅ Query tested in isolation before use

## 📝 Code Review Checklist

When reviewing code changes:

- [ ] Prisma queries use proper AND/OR nesting
- [ ] unstable_cache functions are stored before calling
- [ ] Null values are explicitly handled
- [ ] Queries have timeout protection
- [ ] TypeScript compiles without errors
- [ ] No duplicate property names in objects
- [ ] Database queries are tested

## 🛠️ Common Fixes

### "Internal Server Error"
1. Check Prisma query structure
2. Check for TypeScript errors
3. Clear cache and restart server
4. Test query in isolation

### "Stuck Compiling"
1. Check for syntax errors
2. Check for duplicate property names
3. Kill server and restart
4. Clear `.next` directory

### "Products Not Showing"
1. Verify query matches products in database
2. Check for null value handling
3. Test query directly with `npx tsx`
4. Check if products are PUBLISHED

### "Hydration Errors"
1. Ensure server and client render the same HTML
2. Avoid conditional rendering based on `typeof window`
3. Use consistent className values
4. Check for Date.now() or Math.random() in render

## 📚 Additional Resources

- [Prisma Query Documentation](https://www.prisma.io/docs/concepts/components/prisma-client/filtering-and-sorting)
- [Next.js unstable_cache](https://nextjs.org/docs/app/api-reference/functions/unstable_cache)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**Remember:** When in doubt, test in isolation, check the console, and restart the server.

