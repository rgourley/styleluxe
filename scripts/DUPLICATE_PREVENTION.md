# Duplicate Prevention Strategy

## How It Works

Each collection script checks the database **before creating** a new product:

### 1. **Reddit Collection**
```typescript
// Checks if product exists by name (case-insensitive, partial match)
const existing = await prisma.product.findFirst({
  where: {
    name: {
      contains: productName,
      mode: 'insensitive',
    },
  },
})

if (existing) {
  // Updates existing product + adds new trend signal
  // Does NOT create duplicate
} else {
  // Creates new product
}
```

**Matching:** Name contains match (e.g., "CeraVe" matches "CeraVe Moisturizing Cream")

### 2. **Amazon Collection**
```typescript
// Checks if product exists by Amazon URL (exact match)
const existing = await prisma.product.findFirst({
  where: {
    amazonUrl: product.amazonUrl,
  },
})

if (existing) {
  // Updates existing product + adds new trend signal
  // Does NOT create duplicate
} else {
  // Creates new product
}
```

**Matching:** Exact Amazon URL match (most reliable - each Amazon product has unique URL)

### 3. **Google Trends Collection**
```typescript
// Checks if product exists by name (case-insensitive, partial match)
const existing = await prisma.product.findFirst({
  where: {
    name: {
      contains: term,
      mode: 'insensitive',
    },
  },
})

if (existing) {
  // Updates existing product + adds new trend signal
  // Does NOT create duplicate
} else {
  // Creates new product
}
```

**Matching:** Name contains match

## What Happens When Product Exists

✅ **Updates existing product:**
- Updates trend score (keeps highest)
- Adds new trend signal from current source
- Updates price/image if missing

❌ **Does NOT create duplicate:**
- No new product record created
- Just adds new trend signal to existing product

## Cross-Source Matching

The **enrichment script** handles matching products from different sources:

- Reddit finds "CeraVe Moisturizing Cream" → creates product
- Amazon finds "CeraVe Daily Moisturizing Lotion" → might create separate product
- Enrichment script matches them by name similarity → merges into one

## Potential Issues & Improvements

### Current Issues:
1. **Name matching is loose** - "CeraVe" matches "CeraVe Moisturizing Cream" AND "CeraVe Foaming Cleanser" (might merge different products)
2. **Cross-source duplicates** - Same product from Reddit + Amazon might create 2 products until enrichment runs

### Improvements (Future):
1. **Better name matching** - Use exact match or stricter similarity
2. **ASIN matching** - Extract ASIN from Amazon URLs and match by ASIN
3. **Brand + Product matching** - Match by brand + product name combination
4. **Run enrichment automatically** - After each collection, not just "all sources"

## Current Status

✅ **Prevents duplicates within same source** (Reddit won't create duplicate Reddit products)
✅ **Prevents duplicates for Amazon** (exact URL match is reliable)
⚠️ **May create cross-source duplicates** until enrichment runs
✅ **Enrichment merges duplicates** when run

## Example Flow

**Day 1:**
- Reddit finds "CeraVe Moisturizing Cream" → Creates Product #1
- Amazon finds "CeraVe Daily Moisturizing Lotion" → Creates Product #2 (different name, so separate)

**Day 2:**
- Reddit finds "CeraVe Moisturizing Cream" again → Updates Product #1 (no duplicate)
- Amazon finds same product → Updates Product #2 (no duplicate)

**After Enrichment:**
- Enrichment matches Product #1 and #2 → Merges into one product with data from both sources






