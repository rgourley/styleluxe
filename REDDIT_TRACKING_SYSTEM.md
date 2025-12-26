# Reddit Tracking & Product Matching System

## Overview
BeautyFinder tracks trending beauty products by combining data from **Amazon Movers & Shakers** and **Reddit discussions** (r/SkincareAddiction, r/MakeupAddiction, r/beauty, r/Sephora).

---

## How Reddit Tracking Works

### 1. **Reddit Data Collection** (`scripts/collect-reddit.ts`)

**What it does:**
- Scans top posts from beauty subreddits (past 7 days)
- Extracts product mentions from:
  - Post titles
  - Post content
  - Top comments (with >10 upvotes)
- Uses regex patterns to identify product names
- Tracks engagement metrics (upvotes, comments)

**Product Name Extraction:**
```typescript
// Patterns used:
- "Product Name by Brand"
- "Brand Product Name"
- Capitalized phrases (2-6 words)
- Quoted product names
```

**Reddit Score Calculation (max 50 points):**
- Post with >500 upvotes = +20 points
- Post with 300-500 upvotes = +15 points  
- Post with 100-300 upvotes = +10 points
- Multiple posts (3+) = +10 bonus points
- Top comment mentions = +5 bonus points

### 2. **Amazon Data Collection** (`scripts/collect-amazon.ts`)

**What it does:**
- Scrapes Amazon Movers & Shakers (Beauty category)
- Extracts: product name, brand, price, sales jump %, reviews, rating
- Calculates Amazon trend score based on sales velocity

**Amazon Score Calculation:**
```typescript
// ALL products on Amazon Movers & Shakers = 100 points (base)
// These products are TRULY VIRAL with massive sales spikes
// With age decay, they stay in "Trending Now" (70+) for 5-7 days
// Then gradually move to lower sections as they age
```

### 3. **Product Matching** (`scripts/enrich-amazon-with-reddit.ts`)

**Matching Strategy (in order of priority):**

1. **Amazon URL Match** (most reliable)
   - If Reddit product has Amazon URL, match by URL

2. **Name Similarity Match**
   - Normalize names (lowercase, remove special chars)
   - Calculate Jaccard similarity (word overlap)
   - Threshold: 50% similarity required
   - Example:
     ```
     Amazon: "CeraVe Foaming Facial Cleanser"
     Reddit: "cerave foaming cleanser"
     Match: ✅ (high word overlap)
     ```

3. **Brand + Product Type Match**
   - Extract brand from both sources
   - Check if key product words match
   - Requires both brand AND product type to match

**Score Hierarchy (Dynamic):**
```
CURRENTLY on Amazon Movers & Shakers: 100 points (base)
  → With age decay, stay in "Trending Now" (70+) for 5-7 days
  → Tracked daily - if product drops off M&S, score reduces to 50

DROPPED OFF Amazon Movers & Shakers: 50 points (base)
  → Moves to "Rising Fast" section (40-69 points range)
  → If product returns to M&S, score goes back up to 100

Reddit-only products: 0-50 points (based on engagement)
  → Appear in "Rising Fast" section (40-69 points)
  → Can be promoted to 100 if they hit Amazon M&S

System checks M&S status daily:
  - Products ON M&S = 100 base score
  - Products OFF M&S = 50 base score
  - Dynamic adjustment ensures fresh, accurate rankings
```

---

## Database Schema

### Product Table
```prisma
model Product {
  id          String   @id @default(cuid())
  name        String   // Product name
  brand       String?  // Extracted brand
  price       Float?   // Current price
  amazonUrl   String?  // Amazon product URL
  imageUrl    String?  // Product image
  trendScore  Float    // Combined score (0-100)
  status      Status   // FLAGGED, DRAFT, PUBLISHED
  
  // Age decay fields (for homepage trending)
  firstDetected DateTime?
  lastUpdated   DateTime?
  baseScore     Float?
  currentScore  Float?  // Score with age decay
  peakScore     Float?  // Historical peak
  daysTrending  Int?
  
  trendSignals TrendSignal[]
  content      ProductContent?
}
```

### TrendSignal Table
```prisma
model TrendSignal {
  id         String   @id @default(cuid())
  productId  String
  source     String   // 'amazon_movers' or 'reddit_skincare'
  value      Float?   // Sales % or upvotes
  metadata   Json     // Full post/product data
  detectedAt DateTime
  
  product Product @relation(...)
}
```

**TrendSignal Examples:**

**Amazon Signal:**
```json
{
  "source": "amazon_movers",
  "value": 1721,  // Sales jump %
  "metadata": {
    "salesJumpPercent": 1721,
    "rank": 5,
    "category": "Beauty",
    "reviewCount": 15500,
    "rating": 4.4
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
    "url": "https://reddit.com/r/SkincareAddiction/...",
    "inTopComments": true
  }
}
```

---

## Workflow

### Daily Collection Process

1. **Amazon Collection** (`/api/collect-data` with `source: 'amazon'`)
   - **Admin Button:** 🚀 Run Full Collection (includes this step)
   - Scrapes Movers & Shakers
   - Creates/updates products with Amazon data
   - Adds `amazon_movers` TrendSignals

2. **Reddit Collection** (`/api/collect-data` with `source: 'reddit'`)
   - **Admin Button:** 📊 Run Weekly Reddit Scan
   - Scans Reddit posts (past 7 days)
   - Extracts product mentions
   - Tries to match with existing Amazon products
   - Adds `reddit_skincare` TrendSignals

3. **Enrichment** (`/api/enrich-reddit-amazon`)
   - **No dedicated button** (runs as part of Full Collection)
   - For Reddit-only products: searches Amazon
   - For Amazon-only products: searches Reddit
   - Combines data when matches found

4. **Score Recalculation** (`/api/fix-scores`)
   - **Admin Button:** 🔢 Recalculate All Scores
   - Recalculates total scores for all products
   - Applies age decay (products lose points over time)
   - Updates `currentScore` for homepage display

---

## Key Files

### Scripts (Data Collection)
- `scripts/collect-amazon.ts` - Amazon Movers & Shakers scraper
- `scripts/collect-reddit.ts` - Reddit post scanner & product extractor
- `scripts/enrich-amazon-with-reddit.ts` - Cross-platform matching
- `scripts/match-amazon-reddit.ts` - Product deduplication

### API Routes (Automation)
- `/api/collect-data/route.ts` - Main collection endpoint
- `/api/enrich-reddit-amazon/route.ts` - Enrichment endpoint
- `/api/fix-scores/route.ts` - Score recalculation
- `/api/daily-update/route.ts` - Age decay updates
- `/api/cron/collect-data/route.ts` - Vercel cron job

### Libraries (Utilities)
- `lib/trending-products.ts` - Homepage queries & age decay logic
- `lib/age-decay.ts` - Score decay calculations
- `lib/amazon-scraper.ts` - Amazon scraping utilities
- `lib/reddit-api.ts` - Reddit API client

---

## Current Challenges

### 1. **Reddit Product Names Are Messy**
- Users mention multiple products in one post
- Names get concatenated: "Cerave cleanser Laneige toner CosRx snail"
- Hard to match with clean Amazon product names

### 2. **Amazon Search Rate Limiting**
- Reddit script tries to search Amazon for each product
- Amazon may block/rate-limit automated searches
- Results in Reddit-only products without Amazon URLs

### 3. **Brand Extraction**
- Works well for Amazon (structured data)
- Fails for Reddit (unstructured mentions)
- Affects matching accuracy

---

## Scoring Examples

### Example 1: High-Trending Product
```
Product: "CeraVe Foaming Facial Cleanser"
Amazon: +1721% sales jump = 70 points (capped)
Reddit: 3 posts (847, 234, 156 upvotes) = 30 points
Total: 100 points ✅ FLAGGED for content generation
```

### Example 2: Amazon-Only Product
```
Product: "Softsoap Antibacterial Hand Soap"
Amazon: +450% sales jump = 22 points
Reddit: No mentions = 0 points
Total: 22 points ⚠️ Not flagged (needs 60+)
```

### Example 3: Reddit Buzz, No Amazon Data
```
Product: "Fenty Beauty Pro Filter Powder"
Amazon: Not on Movers & Shakers = 0 points
Reddit: 5 posts (>500 upvotes each) = 30 points
Total: 30 points ⚠️ Not flagged (needs 60+)
```

---

## Configuration

### Subreddits Monitored
```typescript
const SUBREDDITS = [
  'SkincareAddiction',
  'MakeupAddiction', 
  'beauty',
  'Sephora'
]
```

### Score Thresholds & Homepage Sections
- **"Trending Now" (70+ points):** Amazon Movers & Shakers products
  - Start at 100 points (base)
  - With age decay, stay here for 5-7 days
  - Day 1: 100 points, Day 2-3: 95 points, Day 4-7: 85 points, Day 8: 70 points
  
- **"Rising Fast" (40-69 points):** Reddit buzz products NOT on Amazon M&S
  - Strong Reddit engagement but not (yet) on M&S
  - Also includes M&S products that aged out of "Trending Now"
  
- **Flagged for content generation:** 60+ points
- **Auto-publish:** Not implemented (manual review required)

### Age Decay Multipliers
```typescript
// Products lose points over time (more aggressive for dynamic homepage)
Day 0-1:   1.0x (no decay - "Just detected")
Day 2-3:   0.95x (5% decay)
Day 4-7:   0.85x (15% decay)
Day 8-14:  0.7x (30% decay)
Day 15-21: 0.5x (50% decay)
Day 22-30: 0.3x (70% decay)
Day 31+:   Removed from homepage
```

---

## Admin Actions

### Manual Product Search
- Admin can search for any product by name or Amazon URL
- System searches both Amazon and Reddit
- Admin selects which Reddit posts to include
- Creates product with combined data

**When manually adding a product:**
- If you provide an Amazon URL, it scrapes the product page for:
  - Product name, brand, price, image
  - Star rating and review count
  - Product description and key features
  - Top 20 reviews (10 most helpful + 10 most recent)
  - Q&A section
- **It does NOT check if the product is on Movers & Shakers**
- The product gets a `trendScore` based only on Reddit signals
- To get Amazon sales jump data, you need to wait for the daily Movers & Shakers collection

### Refresh Amazon Data Button
- On the product edit page, there's a "Refresh Amazon Data" button
- This re-scrapes the Amazon product page for updated:
  - Price, rating, review count
  - Reviews and Q&A
- **It still does NOT check Movers & Shakers**
- It only updates the product page data, not sales velocity

### Getting Movers & Shakers Data
To get Amazon sales jump % and Movers & Shakers ranking:
1. Product must appear on Amazon's Movers & Shakers page
2. Daily collection script (`/api/collect-data?source=amazon`) runs automatically via Vercel cron
3. If the product is already in your database (matched by Amazon URL), it will:
   - Add an `amazon_movers` TrendSignal with sales jump %
   - Update the `trendScore` with Amazon score (0-70 points)
   - Update status to FLAGGED if total score >= 60

**Manual trigger from Admin Panel:**
- Click **"🚀 Run Full Collection"** button
  - This runs `/api/collect-data` with `source: 'all'`
  - Scrapes Amazon Movers & Shakers (~100 products)
  - Then runs weekly Reddit scan
  - Then matches products across platforms
- **Note:** You can't check Movers & Shakers for a single product
  - It always scrapes the entire M&S page
  - If your product is on that page, it will be updated
  - If not, no Amazon sales data will be added

### Content Generation
- Products with 60+ score are flagged
- Admin clicks "Generate Content" 
- Claude AI writes review using:
  - Amazon reviews (from product page scrape)
  - Reddit discussions (from selected posts)
  - Product metadata (price, rating, features)
  - Sales/trend data (if available from Movers & Shakers)

### Product Management
- View all products (filtered by status/source)
- Edit product details
- Merge duplicates
- Delete low-quality products
- Publish to homepage

---

## Admin Panel Buttons Explained

| Button | What It Does | API Endpoint | Use Case |
|--------|-------------|--------------|----------|
| 🚀 **Run Full Collection** | Scrapes Amazon M&S + Reddit + Matching | `/api/collect-data` (source: 'all') | **Use this to check if products are on Movers & Shakers** |
| 📊 **Run Weekly Reddit Scan** | Scans Reddit posts only | `/api/collect-data` (source: 'reddit') | Find new trending products from Reddit |
| ✨ **Generate Content for All FLAGGED** | Runs Claude AI for all 60+ score products | `/api/generate-content` (generateAll: true) | Batch content generation |
| 📥 **Scrape Amazon Product Data** | Re-scrapes product pages for reviews/Q&A | `/api/scrape-amazon-data` | Update reviews for existing products (NOT M&S data) |
| 🗄️ **Run Database Migration** | Applies Prisma schema changes | `/api/migrate-db` | After schema updates |
| 🔄 **Sync Schema** | Force-pushes schema (db push) | `/api/sync-db-schema` | Fix schema drift issues |
| 🔄 **Daily Update** | Recalculates age decay scores | `/api/daily-update` | Update currentScore for homepage |
| 🔢 **Recalculate All Scores** | Recalculates trendScore from signals | `/api/fix-scores` | After changing scoring logic |
| 📦 **Backfill Age Decay** | Sets firstDetected/baseScore for old products | `/api/backfill-age-decay` | One-time migration for existing data |

**Key Insight:**
- Only **"🚀 Run Full Collection"** checks Movers & Shakers
- **"📥 Scrape Amazon Product Data"** only updates product page data (reviews, rating, price)
- **"🔢 Recalculate All Scores"** recalculates scores from existing signals (doesn't fetch new M&S data)

---

## Future Improvements

1. **Better Product Name Extraction**
   - Use NLP/AI to extract clean product names from Reddit
   - Handle multi-product mentions better

2. **Improved Matching**
   - Use embeddings for semantic similarity
   - Match by product category + brand + type

3. **More Data Sources**
   - TikTok hashtags (#beautytok)
   - Instagram mentions
   - Google Trends API

4. **Automated Quality Checks**
   - Flag suspicious products
   - Verify Amazon URLs are valid
   - Check for spam/fake reviews

