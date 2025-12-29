# Build Error Prevention Guide

## Common Build Error Causes

1. **Top-level database imports** - Prisma/client imports that execute during build
2. **Script imports** - Static imports from `@/scripts/` that execute during import
3. **Missing dynamic exports** - API routes without `export const dynamic = 'force-dynamic'`
4. **Side effects during import** - Code that runs when modules are imported

## Prevention Checklist

### For API Routes (`app/api/**/route.ts`)

- [ ] Always include `export const dynamic = 'force-dynamic'` at the top
- [ ] Use dynamic imports for scripts: `const { func } = await import('@/scripts/...')`
- [ ] Avoid top-level prisma imports - use dynamic imports if needed
- [ ] Never import scripts statically - always use `await import()`

### For Scripts (`scripts/*.ts`)

- [ ] Never execute code at module level - only in functions
- [ ] Use lazy imports for prisma/database connections
- [ ] Check for build context before executing: `process.env.NEXT_PHASE`
- [ ] Export functions, don't execute them during import

### For Library Files (`lib/*.ts`)

- [ ] Avoid top-level database connections
- [ ] Use functions that can be called, not executed on import
- [ ] Consider lazy loading for heavy dependencies

## Best Practices

1. **Always use `export const dynamic = 'force-dynamic'`** in API routes
2. **Use dynamic imports** for scripts and heavy dependencies
3. **Lazy load database connections** - only connect when function is called
4. **Run checks before building** - use `npm run check:api-routes`
5. **Test builds locally** - don't rely on CI/CD to catch errors

## Automated Checks

Run these before committing:

```bash
npm run check:api-routes  # Check API routes for issues
npm run check:hydration   # Check for hydration issues
npm run build             # Full build check
```

## Fixing Common Issues

### Issue: "Failed to collect page data for /api/..."
**Fix:** Add `export const dynamic = 'force-dynamic'` and use dynamic imports

### Issue: Script executing during build
**Fix:** Move imports inside functions, use `await import()` instead of `import`

### Issue: Database connection during build
**Fix:** Lazy load prisma: `const { prisma } = await import('../lib/prisma')`




