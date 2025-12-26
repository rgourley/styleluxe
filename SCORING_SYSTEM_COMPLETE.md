# BeautyFinder Complete Scoring & Tracking System

## Overview
BeautyFinder tracks trending beauty products by combining data from **Amazon Movers & Shakers** and **Reddit discussions**. Products are scored 0-100 points and displayed in different homepage sections based on their score and age.

---

## 1. Data Sources

### Amazon Movers & Shakers
- **What:** Products with the biggest sales rank increases on Amazon
- **How Often:** Scraped daily at 9am EST (Vercel cron job)
- **Data Collected:**
  - Product name, brand, price, image
  - Amazon URL (unique identifier)
  - Sales jump percentage (e.g., +1721%)
  - Position on M&S list (#1, #2, etc.)

### Reddit
- **Subreddits:** r/SkincareAddiction, r/MakeupAddiction, r/beauty, r/Sephora
- **How Often:** Scanned weekly
- **Data Collected:**
  - Product mentions in posts/comments
  - Upvotes, comments, engagement
  - Post URLs for reference

---

## 2. Scoring System (0-100 Points)

### Base Score Assignment

#### Amazon Movers & Shakers Products
```
ALL products on Amazon M&S = 100 points (base)

Why 100?
- These products have MASSIVE sales spikes (500%+ increases)
- They are truly viral, not just Reddit buzz
- Deserves top placement on homepage
```

#### Reddit-Only Products (NOT on Amazon M&S)
```
Score: 0-50 points based on engagement

Calculation:
- Post with 500+ upvotes = +20 points (max 2 posts)
- Post with 300-500 upvotes = +15 points (max 2 posts)
- 3+ Reddit posts = +10 bonus points
- 2 Reddit posts = +5 bonus points

Max Reddit score: 50 points
```

#### Products That Drop Off Amazon M&S
```
When a product is no longer on M&S list:
- Base score: 100 → 50 (reduced to Reddit-level)
- Moves from "Trending Now" to "Rising Fast" section
- Can return to 100 if it appears on M&S again
```

---

## 3. Age Decay System

Products lose points over time to keep the homepage fresh.

### Decay Multipliers
```typescript
Day 0-1:   1.0x  (100% of base score - "Just detected!")
Day 2-3:   0.95x (95% of base score - slight decay)
Day 4-7:   0.85x (85% of base score - moderate decay)
Day 8-14:  0.7x  (70% of base score - significant decay)
Day 15-21: 0.5x  (50% of base score - heavy decay)
Day 22-30: 0.3x  (30% of base score - very heavy decay)
Day 31+:   Removed from homepage
```

### Score Calculation
```
currentScore = baseScore × ageMultiplier

Example (Amazon M&S product):
Day 1:  100 × 1.0  = 100 points
Day 2:  100 × 0.95 = 95 points
Day 5:  100 × 0.85 = 85 points
Day 10: 100 × 0.7  = 70 points
Day 20: 100 × 0.5  = 50 points
```

---

## 4. Database Schema

### Product Table (Key Fields)
```prisma
model Product {
  id          String
  name        String
  brand       String?
  price       Float?
  amazonUrl   String?
  status      ProductStatus  // FLAGGED, DRAFT, PUBLISHED
  
  // Scoring fields
  trendScore  Float          // Legacy score (0-100)
  baseScore   Float?         // Raw score before age decay
  currentScore Float?        // Score after age decay applied
  peakScore   Float?         // Highest score ever reached
  
  // Age tracking
  firstDetected DateTime?    // When first seen in trending data
  lastUpdated   DateTime?    // Last time data was refreshed
  daysTrending  Int?         // Days since first detected
  
  // Amazon M&S tracking
  onMoversShakers         Boolean?  // Currently on M&S?
  lastSeenOnMoversShakers DateTime? // Last seen on M&S
  
  // Relations
  trendSignals TrendSignal[]
  content      ProductContent?
  reviews      Review[]
}
```

### TrendSignal Table
```prisma
model TrendSignal {
  id         String
  productId  String
  source     String   // "amazon_movers" or "reddit_skincare"
  signalType String   // "sales_spike" or "reddit_mentions"
  value      Float?   // Sales % or upvotes
  metadata   Json     // Full data (post URL, position, etc.)
  detectedAt DateTime
}
```

**Example Signals:**

**Amazon Signal:**
```json
{
  "source": "amazon_movers",
  "value": 1721,  // Sales jump %
  "metadata": {
    "salesJumpPercent": 1721,
    "position": 5,
    "category": "Beauty"
  }
}
```

**Reddit Signal:**
```json
{
  "source": "reddit_skincare",
  "value": 847,  // Post upvotes
  "metadata": {
    "subreddit": "SkincareAddiction",
    "title": "This cleanser changed my skin!",
    "score": 847,
    "comments": 234,
    "url": "https://reddit.com/..."
  }
}
```

---

## 5. Daily Collection Process

### Step 1: Amazon Movers & Shakers Collection
```
Script: scripts/collect-amazon.ts
Endpoint: /api/collect-data?source=amazon
Frequency: Daily at 9am EST (Vercel cron)

Process:
1. Scrape Amazon M&S page (~100 products)
2. For each product:
   a. Check if exists by amazonUrl
   b. If exists:
      - Set onMoversShakers = true
      - Set lastSeenOnMoversShakers = now
      - Set baseScore = 100
      - Update price/image if changed
      - Add new TrendSignal (if sales % changed)
   c. If new:
      - Create product with baseScore = 100
      - Set onMoversShakers = true
      - Create TrendSignal
3. After collection:
   - Find products with onMoversShakers = true
   - If NOT in current M&S list:
     - Set onMoversShakers = false
     - Reduce baseScore: 100 → 50
     - Log: "Product X dropped off M&S"
```

### Step 2: Reddit Collection
```
Script: scripts/collect-reddit.ts
Endpoint: /api/collect-data?source=reddit
Frequency: Weekly

Process:
1. Scan Reddit posts (past 7 days)
2. Extract product mentions using regex
3. For each product:
   a. Check if exists by name
   b. Calculate Reddit score (0-50)
   c. If exists:
      - Add new TrendSignal
      - Update score if higher
   d. If new:
      - Create product with baseScore = Reddit score
      - Try to find Amazon URL
```

### Step 3: Score Recalculation
```
Script: lib/trending-products.ts → recalculateAllScores()
Endpoint: /api/daily-update
Frequency: Daily at 9am EST (after collection)

Process:
1. Get all products with firstDetected set
2. For each product:
   a. Calculate daysTrending (days since firstDetected)
   b. Get age multiplier based on days
   c. Calculate: currentScore = baseScore × multiplier
   d. Update: currentScore, daysTrending, peakScore
   e. Set lastUpdated = now
```

---

## 6. Homepage Sections

### Section 1: "Trending Now" (70+ points)
```
Query: currentScore >= 70 AND daysTrending <= 30
Sort: currentScore DESC
Limit: 8 products

Who appears here:
- Amazon M&S products (days 1-14)
- Products with base score 100 that haven't decayed below 70 yet

Example:
Day 1:  Score 100 → In "Trending Now"
Day 10: Score 70  → Still in "Trending Now"
Day 15: Score 50  → Drops out
```

### Section 2: "Rising Fast" (40-69 points)
```
Query: currentScore >= 40 AND currentScore < 70 AND daysTrending <= 14
Sort: currentScore DESC
Limit: 8 products

Who appears here:
- Reddit-only products with strong engagement (40-50 base)
- Amazon M&S products that dropped off (50 base)
- Older M&S products that aged out of "Trending Now"

Example:
- Reddit product: 45 base → 43 current (day 2)
- Dropped M&S: 50 base → 48 current (day 3)
- Aged M&S: 100 base → 50 current (day 15)
```

### Section 3: "Peak Viral" (80+ points, recent)
```
Query: currentScore >= 80 AND daysTrending <= 30
Sort: currentScore DESC
Limit: 8 products

Who appears here:
- Amazon M&S products in their first week
- Highest viral products only

Example:
Day 1-7: Score 85-100 → "Peak Viral"
```

---

## 7. Product Lifecycle Example

### Example: CeraVe Foaming Cleanser

**Day 1: Appears on Amazon M&S**
```
Action: Amazon collection finds it
Result:
- Created in database
- baseScore = 100
- currentScore = 100 (1.0x multiplier)
- onMoversShakers = true
- firstDetected = 2025-12-25
- daysTrending = 0
- TrendSignal created (source: amazon_movers, value: 1721%)
- Status: FLAGGED (score >= 60)
Homepage: "Trending Now" section
```

**Day 2: Still on M&S**
```
Action: Daily update recalculates scores
Result:
- baseScore = 100 (unchanged)
- currentScore = 95 (0.95x multiplier)
- daysTrending = 1
- onMoversShakers = true (still on M&S)
Homepage: "Trending Now" section
```

**Day 5: Still on M&S**
```
Action: Daily update
Result:
- baseScore = 100
- currentScore = 85 (0.85x multiplier)
- daysTrending = 4
Homepage: "Trending Now" section
```

**Day 8: Drops off M&S**
```
Action: Amazon collection doesn't find it
Result:
- baseScore = 100 → 50 (reduced!)
- currentScore = 50 × 0.7 = 35 (age decay applied)
- onMoversShakers = false
- daysTrending = 7
Homepage: Drops out (score < 40)
```

**Day 10: Reddit buzz picks up**
```
Action: Reddit collection finds 2 posts (400 upvotes each)
Result:
- Reddit score = 30 points
- baseScore = 50 + 30 = 80 (combined!)
- currentScore = 80 × 0.7 = 56
- daysTrending = 9
Homepage: "Rising Fast" section
```

**Day 15: Returns to M&S**
```
Action: Amazon collection finds it again
Result:
- baseScore = 50 → 100 (back to viral!)
- currentScore = 100 × 0.5 = 50 (age decay for day 15)
- onMoversShakers = true
- daysTrending = 14
Homepage: "Rising Fast" section (will move up as it ages back to day 1)
```

---

## 8. Matching & Deduplication

### How Products Are Matched Across Sources

**Priority 1: Amazon URL (Most Reliable)**
```typescript
// When Reddit finds a product, check if Amazon product exists
const existing = await prisma.product.findFirst({
  where: { amazonUrl: amazonUrl }
})

// If found, merge Reddit signals into Amazon product
```

**Priority 2: Name Similarity**
```typescript
// Normalize names (lowercase, remove special chars)
const normalize = (name) => 
  name.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[^\w\s-]/g, '')

// Calculate Jaccard similarity (word overlap)
const similarity = intersection.size / union.size

// Match if similarity > 50%
if (similarity > 0.5) {
  // Merge products
}
```

**Priority 3: Brand + Product Type**
```typescript
// Extract brand (first capitalized word)
const brand = productName.match(/^([A-Z][a-zA-Z\s&]+?)\s+/)?.[1]

// Match if:
// - Brand matches (case-insensitive)
// - AND key product words overlap
```

---

## 9. Content Generation

### When Content Is Generated
```
Trigger: Product reaches 60+ points (FLAGGED status)
Process:
1. Admin clicks "Generate Content" in admin panel
2. System fetches:
   - Amazon reviews (top 20)
   - Reddit discussions (selected posts)
   - Product metadata (price, features, rating)
   - Trend data (sales spike %, Reddit mentions)
3. Claude AI generates:
   - Hook (2-sentence summary)
   - Why It's Trending
   - What It Does
   - The Good / The Bad
   - Who Should Try It / Skip It
   - Alternatives
   - What Real Users Say
   - FAQ
4. Content saved to ProductContent table
5. Product status: FLAGGED → DRAFT
6. Admin reviews and publishes
```

---

## 10. Admin Workflow

### 1. Data Collection
```
Admin Panel → "🚀 Run Full Collection" button
↓
Runs: /api/collect-data (source: 'all')
↓
- Scrapes Amazon M&S (~100 products)
- Scans Reddit posts (past 7 days)
- Matches products across platforms
- Updates scores
↓
Result: Products with 60+ score are FLAGGED
```

### 2. Content Generation
```
Admin Panel → Product List → Filter: FLAGGED
↓
Click "Generate Content" on a product
↓
Claude AI generates full review
↓
Product status: FLAGGED → DRAFT
```

### 3. Manual Editing
```
Admin Panel → Product List → Click product name
↓
Edit page with:
- Product details (name, brand, price)
- Editor notes (context for AI)
- Reddit hotness rating (1-5)
- Google Trends URL
- "✨ Regenerate with AI" buttons per section
↓
Save changes (auto-save on blur)
```

### 4. Publishing
```
Admin Panel → Product List → Filter: DRAFT
↓
Click "Publish" button
↓
Product status: DRAFT → PUBLISHED
↓
Appears on homepage in appropriate section
```

---

## 11. Key Files & Functions

### Data Collection
- `scripts/collect-amazon.ts` → `processAmazonData()`
  - Scrapes Amazon M&S
  - Marks products as on/off M&S
  - Sets base score to 100 or 50

- `scripts/collect-reddit.ts` → `processRedditData()`
  - Scans Reddit posts
  - Extracts product mentions
  - Calculates Reddit score (0-50)

### Scoring & Age Decay
- `lib/age-decay.ts`
  - `getAgeMultiplier(days)` → Returns 0.95x, 0.85x, etc.
  - `calculateCurrentScore(base, firstDetected)` → Applies decay
  - `calculateDaysTrending(firstDetected)` → Days since first seen

- `lib/trending-products.ts`
  - `recalculateAllScores()` → Daily score update
  - `getTrendingNowHomepage()` → Query for "Trending Now"
  - `getRisingFastProducts()` → Query for "Rising Fast"
  - `setFirstDetected()` → Initialize age tracking

### API Endpoints
- `/api/collect-data` → Manual/cron data collection
- `/api/daily-update` → Recalculate age decay scores
- `/api/cron/collect-data` → Vercel cron job (9am daily)
- `/api/generate-content` → Claude AI content generation
- `/api/products/[id]/scrape-amazon` → Refresh single product

### Database
- `prisma/schema.prisma` → Schema definition
- `lib/prisma.ts` → Prisma client (lazy-loaded)

---

## 12. Automation

### Vercel Cron Job
```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/collect-data",
    "schedule": "0 9 * * *"  // 9am EST daily
  }]
}
```

**What It Does:**
1. Scrapes Amazon M&S
2. Scans Reddit (weekly)
3. Matches products
4. Updates on/off M&S status
5. Recalculates age decay scores
6. Flags new products (60+ score)

---

## 13. Score Thresholds Summary

| Score Range | Section | Typical Products |
|-------------|---------|------------------|
| 100 | Peak Viral | Amazon M&S (day 1) |
| 95 | Trending Now | Amazon M&S (day 2-3) |
| 85 | Trending Now | Amazon M&S (day 4-7) |
| 70 | Trending Now | Amazon M&S (day 8-14) |
| 60 | FLAGGED | Threshold for content generation |
| 50 | Rising Fast | Dropped M&S or strong Reddit |
| 40 | Rising Fast | Reddit buzz products |
| <40 | Not shown | Too low or too old |

---

## 14. Edge Cases & Special Logic

### Product Returns to M&S
```
If product was on M&S, dropped off, then returns:
- baseScore: 50 → 100 (restored)
- onMoversShakers: false → true
- Age decay continues from original firstDetected
- Does NOT reset daysTrending
```

### Product Has Both Amazon + Reddit
```
Score calculation:
- If on M&S: baseScore = 100 (Reddit ignored)
- If off M&S: baseScore = 50 + Reddit bonus (max 80)
- Reddit bonus: Up to 30 points for high engagement
```

### Manual Product Addition
```
Admin can manually add products:
1. Search by name or Amazon URL
2. System searches Amazon + Reddit
3. Admin selects Reddit posts to include
4. Product created with combined score
5. If not on M&S: baseScore = Reddit score only
```

---

## 15. Future Improvements

### Planned
- TikTok hashtag tracking (#beautytok)
- Instagram mentions
- Google Trends API integration
- Automated quality checks (spam detection)
- Better product name extraction from Reddit

### Considered
- Machine learning for product matching
- Sentiment analysis on reviews
- Price drop alerts
- Influencer mention tracking

---

## Quick Reference

**Base Scores:**
- On Amazon M&S: **100 points**
- Off Amazon M&S: **50 points**
- Reddit-only: **0-50 points**

**Age Decay:**
- Day 1: **100%**
- Day 2-3: **95%**
- Day 4-7: **85%**
- Day 8-14: **70%**
- Day 15+: **50% or less**

**Homepage Sections:**
- Trending Now: **70+ points**
- Rising Fast: **40-69 points**
- Peak Viral: **80+ points**

**Daily Process:**
1. Scrape Amazon M&S (9am)
2. Mark products on/off M&S
3. Recalculate age decay
4. Update homepage sections

**Key Insight:**
Products dynamically move between sections based on:
- Current M&S status (on = 100, off = 50)
- Age (older = lower score)
- Reddit engagement (bonus points)

