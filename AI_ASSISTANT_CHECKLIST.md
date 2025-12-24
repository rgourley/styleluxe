# AI Assistant Checklist - Preventing Breaking Changes

## Before Making ANY Changes

### 1. Understand the Request
- [ ] Read the full request carefully
- [ ] Identify all files that might be affected
- [ ] Check for similar patterns in the codebase
- [ ] Understand the current implementation

### 2. Check for Hydration Risks
- [ ] Run `npm run check:hydration` before making changes
- [ ] Look for `Date.now()`, `Math.random()`, `new Date()` in components
- [ ] Check for `typeof window !== 'undefined'` conditionals
- [ ] Verify date formatting is consistent
- [ ] Check Fragment usage (prefer single container divs)

### 3. Review Related Files
- [ ] Check if changes affect server components
- [ ] Verify client components are marked with `'use client'`
- [ ] Check for any shared utilities or hooks
- [ ] Review similar implementations in the codebase

### 4. Test Before Committing
- [ ] Run `npm run build` to check for TypeScript errors
- [ ] Check for linting errors
- [ ] Verify the change doesn't break existing functionality
- [ ] Test in browser if possible (check console for hydration warnings)

## Common Pitfalls to Avoid

### Hydration Errors
- ❌ Using `Date.now()` or `Math.random()` in render
- ❌ Conditional rendering based on `typeof window`
- ❌ Locale-specific date formatting
- ❌ Fragment wrappers with mixed content types
- ❌ Dynamic attributes that differ server vs client

### Breaking Changes
- ❌ Changing API response formats without updating consumers
- ❌ Modifying database schema without migrations
- ❌ Changing component props without updating all usages
- ❌ Removing or renaming exports without checking imports

### Best Practices
- ✅ Use `useMemo` for dynamic calculations in client components
- ✅ Format dates on server and pass as strings
- ✅ Use single container divs instead of Fragments
- ✅ Keep server and client rendering logic identical
- ✅ Test builds before committing

## When Making Changes

1. **Read the file first** - Understand the current structure
2. **Check for patterns** - Look for similar code in the codebase
3. **Make minimal changes** - Only change what's necessary
4. **Test immediately** - Run build and check for errors
5. **Verify hydration** - Check browser console after changes

## After Making Changes

- [ ] Run `npm run check:api-routes` - **MUST PASS** (catches build issues early)
- [ ] Run `npm run build` - **MUST PASS** (build errors block push)
- [ ] Run `npm run check:hydration` - Should pass
- [ ] Check for linting errors
- [ ] Verify no breaking changes
- [ ] Test in browser if possible

## Before Pushing to Git

- [ ] **ALWAYS run `npm run check:api-routes` first** - Catches issues early
- [ ] **ALWAYS run `npm run build` before pushing** - This is critical!
- [ ] If checks fail, fix errors before pushing
- [ ] Pre-push hook will run checks and build automatically
- [ ] Never push if build has errors

## API Route Best Practices (CRITICAL)

When creating or modifying API routes:
- [ ] **Always add** `export const dynamic = 'force-dynamic'` at the top
- [ ] **Never use** static imports from `@/scripts/` - use `await import()` instead
- [ ] **Prefer dynamic imports** for heavy dependencies (prisma, scripts)
- [ ] **Test build** after every API route change

## If Hydration Error Occurs

1. **Identify the mismatch** - Check server vs client HTML
2. **Find the root cause** - Look for dynamic values or conditionals
3. **Fix consistently** - Ensure server and client render the same
4. **Test thoroughly** - Verify fix works
5. **Document the fix** - Add to HYDRATION_PREVENTION.md if it's a new pattern

