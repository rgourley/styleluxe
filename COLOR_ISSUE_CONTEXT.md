# Color Issue Context - Files for LLM Review

## Problem
Colors (badges, buttons, links, logo) are not showing consistently across the site. The site uses Tailwind CSS v4 with a mix of CSS variables and hardcoded hex colors.

## Current CSS System
- **Tailwind CSS v4** (latest version)
- **PostCSS** with `@tailwindcss/postcss` plugin
- **CSS Variables** defined in `:root` but not consistently used
- **Hardcoded hex colors** used throughout components (e.g., `bg-[#fafafa]`, `text-[#1a1a1a]`)

## Files Included
1. `app/globals.css` - Main CSS file with CSS variables and global styles
2. `app/page.tsx` - Homepage with many color definitions
3. `components/ProductCard.tsx` - Product card component with badge colors
4. `app/products/[slug]/page.tsx` - Product detail page (partial - see buttons section)
5. `app/layout.tsx` - Root layout with font setup
6. `postcss.config.mjs` - PostCSS configuration
7. `package.json` - Dependencies (shows Tailwind v4)

## Key Issues to Address
- Badge colors (red, orange, yellow) not showing
- Button colors not showing
- Link colors not showing
- Logo colors ("Style" vs "Luxe") not showing correctly

## Current Color Approach
- CSS variables are defined but components use hardcoded Tailwind arbitrary values
- Example: `bg-[#fafafa]` instead of using `--background` variable
- Mix of Tailwind utility classes and inline hex colors

