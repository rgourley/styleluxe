# Hydration Error Prevention Guide

## Common Causes of Hydration Errors

1. **Fragment wrappers with mixed content** - Using `<>` with script tags and divs
2. **Dynamic values in render** - `Date.now()`, `Math.random()`, `new Date()`
3. **Client-only conditionals** - `if (typeof window !== 'undefined')`
4. **Locale-specific formatting** - Date/number formatting that differs server vs client
5. **Browser extensions** - Can modify HTML before React loads (unavoidable)
6. **Mismatched attributes** - Different alt text, className, or props between server/client

## Prevention Checklist

Before making changes to components, check:

- [ ] No `Date.now()`, `Math.random()`, or other dynamic values in render
- [ ] No `typeof window !== 'undefined'` checks in components
- [ ] All dates formatted consistently (use `toISOString()` or fixed format)
- [ ] No conditional rendering based on client-only state in initial render
- [ ] All attributes (alt, className, etc.) are deterministic
- [ ] Fragment wrappers (`<>`) are used correctly (prefer single container divs)
- [ ] Script tags are inside the main container, not as siblings to it

## Best Practices

1. **Use single container divs** instead of Fragments when possible
2. **Memoize dynamic calculations** with `useMemo` for client components
3. **Format dates on server** and pass as strings to client components
4. **Use consistent attribute generation** - same logic server and client
5. **Test hydration** - Check browser console for hydration warnings after changes

## Code Review Checklist

When reviewing changes:
- [ ] Check for any dynamic values in JSX
- [ ] Verify date formatting is consistent
- [ ] Ensure no client-only conditionals in initial render
- [ ] Check Fragment usage
- [ ] Verify all attributes are deterministic

