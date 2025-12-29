# Why Products Aren't Being Combined (Amazon + Reddit)

## Current Situation

**Amazon-only products:** 21 products
- Examples: "Softsoap Antibacterial Liquid Hand Refill", "Loccitane Cleansing Softening Almond Shower"
- ✅ Have Amazon URLs
- ✅ Have brands extracted
- ✅ Clean, structured names

**Reddit-only products:** 6 products  
- Examples: "Cerave foaming cleanser Laneige Cream Skin Toner No cosm", "Fenty Beauty Pro Filter Loose Powder in Coffee"
- ❌ **NO Amazon URLs** (this is the main problem!)
- ❌ **NO brands extracted** (brands are null)
- ❌ Concatenated/messy names (multiple products in one name)

**Combined products:** 0 ❌

---

## Root Causes

### 1. **Reddit Products Don't Have Amazon URLs** (CRITICAL)

The Reddit collection script (`collect-reddit.ts`) is supposed to:
1. Extract product names from Reddit posts
2. Search Amazon for each product using `searchAmazonProduct()`
3. If found, add the Amazon URL to the Reddit product

**Why it's failing:**
- Amazon search might be rate-limited or blocked
- Product names from Reddit are messy/concatenated, so Amazon search doesn't find matches
- Example: Searching Amazon for "Cerave foaming cleanser Laneige Cream Skin Toner No cosm" won't find anything

**Impact:** Without Amazon URLs, the enrichment script can't match by URL (the most reliable method).

### 2. **Name Matching Is Too Weak**

The matching algorithm uses:
- **Similarity threshold: 0.25** (25% similarity required)
- **Brand matching:** Requires brands to match exactly (case-insensitive)
- **Word overlap:** Jaccard similarity

**Why it's failing:**
- Amazon: "Softsoap Antibacterial Liquid Hand Refill"
- Reddit: "Cerave foaming cleanser Laneige Cream Skin Toner No cosm"
- These are **completely different products** - they shouldn't match!

**The real issue:** Reddit posts mention multiple products in one post, creating concatenated names that don't match any single Amazon product.

### 3. **Brand Extraction Failing for Reddit**

Reddit products have `brand: null` because:
- Names are concatenated: "Cerave foaming cleanser Laneige Cream Skin Toner"
- Brand extraction regex `^([A-Z][a-zA-Z\s&]+?)\s+` might not work for messy names
- Without brands, brand-based matching can't work

### 4. **Different Products, Not Duplicates**

Looking at the actual products:
- **Amazon:** Hand soap, shower gel, hair products (mostly generic/utility items)
- **Reddit:** Fenty Beauty, Too Faced, Cerave, Laneige (premium beauty brands)

These are **genuinely different products** from different categories. They're not the same products - they're just both beauty-related.

---

## What Should Happen

### Ideal Flow:
1. **Reddit collection** finds "Fenty Beauty Pro Filter Loose Powder"
2. **Searches Amazon** for "Fenty Beauty Pro Filter Loose Powder"
3. **Finds match** on Amazon → adds Amazon URL to Reddit product
4. **Amazon collection** finds same product on Movers & Shakers
5. **Enrichment script** matches by Amazon URL → combines them

### Current Flow (Broken):
1. **Reddit collection** finds "Fenty Beauty Pro Filter Loose Powder"
2. **Searches Amazon** → **FAILS** (doesn't find match or search fails)
3. **Reddit product** has no Amazon URL
4. **Amazon collection** finds product → creates separate Amazon product
5. **Enrichment script** tries to match by name → **FAILS** (names too different or products genuinely different)

---

## Solutions

### Option 1: Fix Amazon Search for Reddit Products (RECOMMENDED)

**Problem:** Reddit product names are messy/concatenated
**Solution:** 
- Better name cleaning before searching Amazon
- Split concatenated names and search each part
- Extract brand + product name separately
- Example: "Cerave foaming cleanser Laneige Cream Skin Toner" → search for "Cerave foaming cleanser" and "Laneige Cream Skin Toner" separately

### Option 2: Improve Name Matching

**Problem:** 0.25 threshold might be too low, or matching algorithm needs improvement
**Solution:**
- Use fuzzy string matching (Levenshtein distance)
- Better handling of concatenated Reddit names
- Extract individual products from Reddit posts (split by newlines, separators)
- Match each part separately

### Option 3: Use Amazon Product API or Better Scraping

**Problem:** Current Amazon search might not be reliable
**Solution:**
- Use Amazon Product Advertising API (requires API key)
- Better HTML parsing for search results
- Retry logic with different search queries

### Option 4: Manual Matching/Enrichment

**Problem:** Automated matching is hard
**Solution:**
- Add admin UI to manually link Reddit + Amazon products
- Show "suggested matches" based on similarity scores
- Allow admin to approve/reject matches

---

## Immediate Next Steps

1. **Check if Amazon search is actually running** - Add logging to see if `searchAmazonProduct()` is being called and what it returns
2. **Improve Reddit name extraction** - Split concatenated names into individual products
3. **Better brand extraction** - Extract brands from messy Reddit names
4. **Lower matching threshold or improve algorithm** - Try fuzzy matching libraries

---

## Code Locations

- **Reddit collection:** `scripts/collect-reddit.ts` (line ~669: `searchAmazonProduct()`)
- **Amazon search function:** `lib/amazon-search.ts`
- **Enrichment/matching:** `scripts/enrich-products.ts` (line ~185: matching logic)
- **Name similarity:** `scripts/enrich-products.ts` (line ~30: `nameSimilarity()`)

---

## Testing

To test if matching would work:
1. Manually add an Amazon URL to a Reddit product
2. Run enrichment script
3. Check if it matches by URL

To test name matching:
1. Pick an Amazon product and Reddit product that should match
2. Calculate similarity score using `nameSimilarity()`
3. See if it's above 0.25 threshold









