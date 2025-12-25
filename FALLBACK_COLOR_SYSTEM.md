# Fallback Color System (If @theme Doesn't Work)

If Tailwind v4's `@theme` directive isn't processing CSS variables correctly, use this fallback approach in `app/globals.css`:

```css
@import "tailwindcss";

/* Fallback: Use @layer and CSS variables */
@layer base {
  :root {
    --color-background: #FFFBF5;
    --color-background-card: #FFFFFF;
    --color-background-hover: #FFF5F7;
    --color-background-muted: #F5F5F5;
    
    --color-foreground: #2D2D2D;
    --color-foreground-muted: #6b6b6b;
    --color-foreground-light: #8b8b8b;
    
    --color-border: #F0F0F0;
    --color-border-light: #FFE4E9;
    
    --color-primary: #FF6B6B;
    --color-primary-hover: #E07856;
    
    --color-secondary: #A8D5BA;
    --color-secondary-dark: #7FB3A0;
    
    --color-accent-blush: #FFF5F7;
    --color-accent-cream: #FFFBF5;
    
    --color-badge-hot: #FF6B6B;
    --color-badge-rising: #A8D5BA;
    --color-badge-watching: #FFF5F7;
    --color-badge-watching-border: #FFE4E9;
  }
}

/* Rest of globals.css stays the same */
body {
  background: var(--color-background);
  color: var(--color-foreground);
  /* ... */
}
```

**To switch to fallback:**
1. Replace the `@theme { }` block with the `@layer base { :root { } }` block above
2. Keep everything else the same
3. Restart dev server: `npm run dev`

This accomplishes the same thing - CSS variables are defined and used throughout the codebase.

