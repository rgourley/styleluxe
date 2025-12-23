# Amazon Movers & Shakers Tracking

## Current Setup

### ✅ What We Track

1. **Sales Jump Percentage** - The percentage increase in sales rank (e.g., "Up 1,200%")
2. **Position on List** - Where the product appears on Movers & Shakers (#1, #2, #3, etc.)
3. **Position Changes** - We track previous position to see if products moved up/down

### 📍 How It Works

1. **Script**: `scripts/collect-amazon.ts` scrapes https://www.amazon.com/gp/movers-and-shakers/beauty
2. **Frequency**: Currently **manual** - you click "Run All Sources Collection" in admin
3. **Updates**: When a product appears again:
   - If new sales jump % is higher → creates new signal
   - If same/lower → updates existing signal with new position
   - Tracks position changes in metadata

### 🔄 Product Updates

When you run the collection:
- **New products** on the list → Added to database
- **Existing products** → Updated with new position and sales jump %
- **Products that dropped off** → Still in database, but won't get new signals

## Making It Automatic

### Option 1: Vercel Cron (Recommended)

Create `vercel.json` in your project root:

```json
{
  "crons": [{
    "path": "/api/cron/collect-data",
    "schedule": "0 9 * * *"
  }]
}
```

This runs daily at 9 AM UTC. The endpoint is already created at `/app/api/cron/collect-data/route.ts`.

### Option 2: GitHub Actions

Create `.github/workflows/collect-data.yml`:

```yaml
name: Daily Data Collection
on:
  schedule:
    - cron: '0 9 * * *'  # 9 AM UTC daily
  workflow_dispatch:  # Allow manual trigger

jobs:
  collect:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run collect:data
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### Option 3: External Cron Service

Use a service like:
- **Cron-job.org** (free)
- **EasyCron** (free tier)
- **UptimeRobot** (free)

Point it to: `https://yourdomain.com/api/cron/collect-data`

## Position Tracking

Products now track:
- `position` - Current position on Movers & Shakers (#1, #2, etc.)
- `previousPosition` - Previous position (to see if it moved up/down)
- `salesJumpPercent` - The percentage increase

This data is stored in the `TrendSignal.metadata` field.

## Manual Collection

You can still manually trigger collection from the admin page:
- Click **"Run All Sources Collection"** button
- Or click **"Collect Amazon Data"** for just Amazon

## Daily Tracking & Score Updates

### How Products Are Tracked Daily

**Yes, products are tracked daily and scores move up and down based on:**

1. **New Data from Movers & Shakers**
   - When you run collection, it checks if products are still on the list
   - If a product appears again, it updates:
     - New position (e.g., moved from #25 to #10)
     - New sales jump % (e.g., 19% → 37%)
     - New trend signal with timestamp
   - Score recalculates: `Amazon Score (0-70) + Reddit Bonus (0-30) = Total (0-100)`

2. **Age Decay (Scores Decrease Over Time)**
   - Products lose relevance as they age
   - **Days 0-3**: Full score (100%)
   - **Days 4-7**: 80% of score
   - **Days 8-14**: 60% of score
   - **Days 15-21**: 40% of score
   - **Days 22-30**: 20% of score
   - **Days 31+**: Removed from homepage

3. **Score Movement Examples**

   **Product Moving Up:**
   - Day 1: On Movers & Shakers #30 (19% jump) = 10 points
   - Day 2: Still on list, moved to #10 (37% jump) = 18 points
   - Day 3: Moved to #5 (75% jump) = 37 points
   - **Result**: Score increases from 10 → 18 → 37

   **Product Moving Down:**
   - Day 1: On Movers & Shakers #5 (75% jump) = 37 points
   - Day 2: Dropped to #20 (28% jump) = 14 points
   - Day 3: Dropped off list (no new signal)
   - **Result**: Score decreases from 37 → 14 → (age decay applies)

   **Product Staying Hot:**
   - Day 1: On list #2 (100% jump) = 50 points
   - Day 2: Still #2 (100% jump) = 50 points (new signal, score stays high)
   - Day 3: Still #2 (100% jump) = 50 points
   - **Result**: Score stays high as long as it's trending

### Automatic Daily Updates

The system has two types of updates:

1. **Collection Updates** (Manual or Cron)
   - Scrapes Movers & Shakers
   - Updates products with new data
   - Adds new products
   - Recalculates scores based on new signals

2. **Age Decay Updates** (Daily Cron)
   - Runs automatically via `/api/daily-update` or cron job
   - Recalculates `currentScore` based on age
   - Updates `daysTrending` counter
   - Moves products between sections (Trending Now → Recent Trends)

### What Gets Updated Each Day

When collection runs:
- ✅ Products still on Movers & Shakers → **Score updated** (can go up or down)
- ✅ Products that dropped off → **No new signal** (score decays over time)
- ✅ New products on list → **Added to database**
- ✅ Position changes → **Tracked in metadata** (previousPosition vs position)

## Recommendations

1. **Set up automatic collection** - Run daily at 9 AM to catch new products
2. **Monitor position changes** - Products moving up the list are gaining momentum
3. **Track products that drop off** - They may have peaked and are cooling down
4. **Use "Recalculate All Scores"** - After fixing scoring logic, update all existing products
5. **Run "Daily Update"** - Recalculates age decay for all products (can be automated)

