# Traffic & Click Tracking System

## Overview
Products now gain ranking points based on actual user engagement (page views and clicks). This prevents products from dropping to 50 or less points due to aggressive age decay, and rewards products that users actually interact with.

## How It Works

### Traffic Boost Calculation
Products receive bonus points based on:
- **Page Views**: 100 views = +1 point (max +10 points for 1000+ views)
- **Clicks**: 10 clicks = +1 point (max +5 points for 50+ clicks)
- **Total Max Boost**: +15 points

This is a **reasonable rate** that prevents gaming while rewarding genuine engagement.

### Score Calculation
```
Final Score = (Base Score × Age Multiplier) + Traffic Boost
```

Example:
- Base score: 100 (Amazon M&S product)
- Age multiplier: 0.5 (15 days old)
- Decayed score: 50
- Traffic boost: +8 (800 views, 20 clicks)
- **Final score: 58** (instead of 50)

## Database Changes

### New Fields Added to Product Model
- `pageViews` (Int, default 0) - Total page views
- `clicks` (Int, default 0) - Total clicks on Amazon link
- `lastViewedAt` (DateTime?) - Last time product was viewed

### Indexes
- `Product_pageViews_idx` - For sorting by popularity
- `Product_clicks_idx` - For sorting by engagement

## API Endpoints

### POST `/api/track-view`
Tracks a page view for a product.

**Request:**
```json
{
  "productId": "product-id-here"
}
```

**Response:**
```json
{
  "success": true
}
```

### POST `/api/track-click`
Tracks a click (e.g., Amazon link click) for a product.

**Request:**
```json
{
  "productId": "product-id-here"
}
```

**Response:**
```json
{
  "success": true
}
```

## Implementation Details

### 1. Page View Tracking
- Automatically tracked when product page loads
- Uses `ProductViewTracker` component
- Client-side tracking (non-blocking)

### 2. Click Tracking
- Tracked when user clicks Amazon link
- Implemented in `ProductHeroSection` component
- Non-blocking (doesn't prevent navigation)

### 3. Score Recalculation
- `recalculateAllScores()` now includes traffic boost
- Runs daily via `/api/daily-update`
- Updates `currentScore` with traffic boost included

### 4. Age Decay with Traffic Boost
- Updated `calculateCurrentScore()` in `lib/age-decay.ts`
- Now accepts `pageViews` and `clicks` parameters
- Applies traffic boost after age decay

## Migration

Run the migration to add the new fields:

```sql
-- Add traffic tracking fields to Product table
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "pageViews" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "clicks" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "lastViewedAt" TIMESTAMP(3);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "Product_pageViews_idx" ON "Product"("pageViews");
CREATE INDEX IF NOT EXISTS "Product_clicks_idx" ON "Product"("clicks");
```

Or use Prisma:
```bash
npx prisma migrate dev --name add_traffic_tracking
```

## Benefits

1. **Prevents Score Decay**: Products with engagement maintain higher scores
2. **Rewards Popular Products**: Products users actually view/click get boosted
3. **Reasonable Rate**: Max +15 points prevents gaming while rewarding engagement
4. **Non-Intrusive**: Tracking doesn't affect page performance or user experience

## Example Scenarios

### Scenario 1: New Product
- Base score: 100 (Amazon M&S)
- Age: Day 1 (multiplier: 1.0)
- Views: 0, Clicks: 0
- **Score: 100**

### Scenario 2: Popular Product (15 days old)
- Base score: 100 (Amazon M&S)
- Age: Day 15 (multiplier: 0.5)
- Decayed: 50
- Views: 800 (+8), Clicks: 20 (+2)
- **Score: 60** (instead of 50)

### Scenario 3: Very Popular Product (20 days old)
- Base score: 100 (Amazon M&S)
- Age: Day 20 (multiplier: 0.5)
- Decayed: 50
- Views: 1500 (+10 max), Clicks: 60 (+5 max)
- **Score: 65** (instead of 50)

## Future Enhancements

Potential improvements:
- Time-weighted views (recent views count more)
- Click-through rate (clicks/views ratio)
- Session duration tracking
- Bounce rate consideration

