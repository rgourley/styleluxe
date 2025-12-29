# Movers & Shakers Toggle Feature

## Overview
Added an admin toggle to manually specify whether a product is currently on Amazon Movers & Shakers when adding it through the manual search interface.

## Why This Was Needed
Previously, manually added Amazon products were automatically assigned 100 base points (assuming they were from M&S). This caused issues when:
1. Adding older products that had dropped off M&S
2. Adding standard Amazon products that were never on M&S
3. No way to distinguish between current M&S products and others

## What Changed

### 1. Admin UI (`app/admin/page.tsx`)
- Added `isOnMoversShakers` state (defaults to `true`)
- Added checkbox toggle in the Amazon product result section
- Shows clear feedback:
  - ✅ Checked: "Will get 100 base score and appear in 'Trending Now'"
  - ⚠️ Unchecked: "Will get 50 base score (standard Amazon product)"
- Passes `isOnMoversShakers` flag to the API

### 2. API Route (`app/api/approve-search-result/route.ts`)
- Accepts `isOnMoversShakers` parameter (defaults to `true` for backwards compatibility)
- Uses the flag to determine score:
  - `isOnMoversShakers = true` → 100 base score
  - `isOnMoversShakers = false` → 50 base score
- Sets `onMoversShakers` field in database based on toggle
- Sets `lastSeenOnMoversShakers` timestamp only if `isOnMoversShakers = true`

## Scoring Logic

### When Toggle is ON (Movers & Shakers)
- **Base Score:** 100 points
- **Database Fields:**
  - `onMoversShakers: true`
  - `lastSeenOnMoversShakers: current timestamp`
- **Result:** Product appears in "Trending Now" (70+ points)
- **Age Decay:** Will decay over time based on `firstDetected` date

### When Toggle is OFF (Standard Amazon)
- **Base Score:** 50 points
- **Database Fields:**
  - `onMoversShakers: false`
  - `lastSeenOnMoversShakers: null`
- **Result:** Product appears in "Rising Fast" (40-69 points) or lower sections
- **Age Decay:** Will decay over time based on `firstDetected` date

## User Workflow

1. **Search for Product:** Enter product name or Amazon URL
2. **Review Results:** See Amazon product details
3. **Toggle M&S Status:**
   - ✅ Check if product is currently on Movers & Shakers → 100 points
   - ⬜ Uncheck if it's a standard Amazon product → 50 points
4. **Add Product:** Click "Add This Product to List"
5. **Result:** Product is added with appropriate score and M&S status

## Example Use Cases

### Use Case 1: Current M&S Product
- Product: "Kojic Acid Dark Spot Remover Soap"
- Toggle: ✅ ON
- Score: 100 → Appears in "Trending Now"
- Status: `onMoversShakers: true`

### Use Case 2: Product That Dropped Off M&S
- Product: "Brazilian Bum Bum Cream"
- Toggle: ⬜ OFF
- Score: 50 → Appears in "Rising Fast"
- Status: `onMoversShakers: false`

### Use Case 3: Standard Amazon Product (Never on M&S)
- Product: "Generic Face Cream"
- Toggle: ⬜ OFF
- Score: 50 → Appears in "Rising Fast" or lower
- Status: `onMoversShakers: false`

## Automated Collection vs. Manual Addition

### Automated Collection (Run Full Collection)
- Scrapes current M&S page
- Automatically sets `onMoversShakers: true` for all found products
- Automatically sets `onMoversShakers: false` for products that drop off
- Always assigns 100 base score to current M&S products

### Manual Addition (Admin Search)
- Admin has full control via toggle
- Can add products with either 100 or 50 base score
- Useful for:
  - Adding specific products not yet on M&S
  - Re-adding products that dropped off
  - Testing and manual curation

## Database Fields

```typescript
Product {
  baseScore: number          // 100 (M&S) or 50 (standard)
  currentScore: number       // baseScore with age decay applied
  onMoversShakers: boolean   // true if currently on M&S
  lastSeenOnMoversShakers: DateTime? // Last time seen on M&S
  firstDetected: DateTime?   // When product was first added
  daysTrending: number?      // Days since firstDetected
}
```

## Age Decay

Both M&S and standard products decay over time:

```
Day 0-1:   1.0x (full score)
Day 2-3:   0.95x
Day 4-7:   0.85x
Day 8-14:  0.7x
Day 15-21: 0.5x
Day 22-30: 0.3x
Day 31+:   0x (removed from homepage)
```

**Example:**
- M&S product starts at 100 → Day 2: 95 → Day 7: 85 → Day 14: 70 (still in "Trending Now")
- Standard product starts at 50 → Day 2: 48 → Day 7: 43 (in "Rising Fast")

## Benefits

1. **Flexibility:** Admin can manually control M&S status
2. **Accuracy:** Products are scored correctly based on their actual status
3. **Transparency:** Clear feedback on what score the product will receive
4. **Backwards Compatible:** Defaults to M&S (100 points) if flag not provided
5. **Consistent:** Works with existing age decay and scoring system

## Future Enhancements

Possible improvements:
1. Add "Verify M&S Status" button that checks Amazon in real-time
2. Show M&S status in product list (badge or icon)
3. Bulk update M&S status for multiple products
4. Automatic daily check to verify M&S status for all products




