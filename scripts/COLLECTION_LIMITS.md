# Collection Limits

This document explains how many products are collected each time you run the data collection scripts.

## Current Limits (Optimized for Quality)

### **Reddit Collection**
- **Posts Analyzed:** 15 posts per subreddit × 3 subreddits = **45 posts total**
- **Subreddits:** r/SkincareAddiction, r/MakeupAddiction, r/AsianBeauty
- **Products Stored:** Only products with **trend score ≥ 60** (typically **5-15 products** per run)
- **Why:** Focuses on highest quality posts with strong engagement (>300 upvotes)

### **Amazon Collection**
- **Products Scraped:** Up to **30 products** from Movers & Shakers
- **Products Stored:** All products found (typically **20-30 products** per run)
- **Why:** Movers & Shakers already filters for trending products, so we take top 30

### **Google Trends Collection**
- **Trends Analyzed:** Top **20 beauty-related** trending search terms
- **Products Stored:** Varies (typically **5-10 products** per run)
- **Why:** Filters for beauty keywords, limits to most relevant trends

## Expected Results Per Collection Run

When you click **"Run All Sources Collection"**:

- **Total Products Analyzed:** ~95 items (45 Reddit posts + 30 Amazon + 20 Google Trends)
- **Total Products Stored:** Typically **15-35 products** (after filtering by trend score ≥ 60)
- **Flagged for Review:** Products with score ≥ 60 (typically **10-20 products**)

## Why These Limits?

1. **Quality over Quantity:** We only store products with strong signals (score ≥ 60)
2. **Manageable Volume:** 15-35 new products per run is enough to review without being overwhelming
3. **Fresh Data:** Running daily/weekly keeps the dashboard current without database bloat
4. **Performance:** Limits ensure fast collection and processing

## Adjusting Limits

If you want to change these limits, edit:
- `scripts/collect-reddit.ts` - Line 58: Change `limit=15` to adjust Reddit posts
- `scripts/collect-amazon.ts` - Line 191: Change `.slice(0, 30)` to adjust Amazon products
- `scripts/collect-google-trends.ts` - Line 109: Change `.slice(0, 20)` to adjust Google Trends

**Recommendation:** Keep limits as-is for best balance of quality and quantity.







