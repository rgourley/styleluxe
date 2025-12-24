# Data Collection Strategy

## Current Approach: **Hybrid (Recommended)**

We use a **two-phase approach**:

### Phase 1: Independent Collection
Each source searches **independently** and adds products separately:
- ✅ **Reddit**: Searches subreddits, extracts product mentions
- ✅ **Amazon**: Scrapes Movers & Shakers page
- ✅ **Google Trends**: Fetches trending searches

**Why this is good:**
- Each source can run independently (fault tolerance)
- Easy to debug (know which source failed)
- Can run sources separately if needed
- No dependencies between sources

### Phase 2: Enrichment & Merging
After all sources collect data, we **enrich and merge**:
- Matches products across sources (same product from Reddit + Amazon)
- Merges duplicate products
- Enriches products with data from other sources (e.g., add Amazon URL to Reddit product)
- Combines trend scores from multiple sources

**Why this is good:**
- Richer product data (Amazon URL + Reddit mentions = complete picture)
- No duplicate products
- Higher trend scores when product is trending on multiple sources
- Better data quality

## Alternative Approaches (Not Used)

### Option A: Search One Source, Enrich from Others
**How it would work:**
1. Search Reddit for products
2. For each Reddit product, search Amazon to find listing
3. Add Amazon data to Reddit product

**Pros:**
- Products always have complete data
- No duplicates

**Cons:**
- If Reddit fails, nothing gets collected
- Slower (sequential, not parallel)
- Harder to debug
- Can't run sources independently

### Option B: Search All, No Merging
**How it would work:**
- Each source adds products independently
- No matching or merging
- Products can be duplicates

**Pros:**
- Simplest
- Fastest

**Cons:**
- Duplicate products (same product from multiple sources)
- Missing data (Reddit product without Amazon URL)
- Lower data quality

## Current Implementation

```bash
# Phase 1: Collect from all sources (parallel)
npm run collect:reddit   # Independent
npm run collect:amazon   # Independent  
npm run collect:trends   # Independent

# Or run all at once:
npm run collect:data     # Runs all + enrichment

# Phase 2: Enrich and merge (optional, runs automatically with "all")
npm run collect:enrich   # Match and merge products
```

## How Matching Works

Products are matched using:
1. **Normalized name comparison** (removes spaces, special chars, case)
2. **Similarity scoring** (80%+ similarity = same product)
3. **Source data merging** (combines Amazon URL, images, prices, etc.)

## Example Flow

1. **Reddit finds**: "CeraVe Moisturizing Cream" (trend score: 65)
   - Creates product with name, Reddit mentions, no Amazon URL

2. **Amazon finds**: "CeraVe Daily Moisturizing Lotion" (trend score: 40)
   - Creates product with name, Amazon URL, price, image

3. **Enrichment matches them** (similar names):
   - Merges into single product
   - Combines: name, Amazon URL, price, image, Reddit mentions
   - Combined trend score: 65 (max of both)

## Recommendation

**Stick with the hybrid approach** - it gives you:
- ✅ Reliability (sources independent)
- ✅ Rich data (cross-source enrichment)
- ✅ No duplicates (smart matching)
- ✅ Flexibility (run sources separately or together)






