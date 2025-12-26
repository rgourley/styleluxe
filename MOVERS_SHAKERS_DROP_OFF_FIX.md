# Movers & Shakers Drop-Off Fix

## Problem
Products that were 100 points yesterday were dropping to exactly 50 points today when they fell off the Movers & Shakers list. This was too harsh and didn't account for gradual decay.

## Solution

### 1. Gradual Score Reduction (10-15 points)
When a product drops off Movers & Shakers:
- **Before**: Base score immediately set to 50
- **After**: Base score reduced by 10-15 points (or 12% of current score, whichever is more)
- **Minimum**: Never goes below 50

**Example:**
- Product with 100 base score drops off M&S
- Reduction: 12 points (12% of 100)
- New base score: 88 (instead of 50)
- With age decay and traffic boost, final score could be 70-80

### 2. Faster Decay for Dropped Products
Products that dropped off M&S now decay faster:

**Normal Decay (still on M&S):**
- Day 0-1: 100% of base score
- Day 2-3: 95% of base score
- Day 4-7: 85% of base score
- Day 8-14: 70% of base score
- Day 15-21: 50% of base score
- Day 22-30: 30% of base score

**Faster Decay (dropped off M&S):**
- Day 0-1: 90% of base score (faster initial decay)
- Day 2-3: 80% of base score (faster decay)
- Day 4-7: 65% of base score (much faster decay)
- Day 8-14: 50% of base score (very fast decay)
- Day 15-30: 30% of base score (heavy decay)
- Day 31+: 20% of base score (still visible but low)

### 3. No Minimum Score (Gradual Decay to Zero)
Products can decay to zero over time:
- No artificial minimum score
- Products will gradually decay based on age and traffic
- Prevents huge daily swings (100 → 50 in one day)
- But allows natural decay to zero over weeks/months

## Implementation Details

### Modified Functions

1. **`getAgeMultiplier(daysTrending, droppedOffMS)`**
   - Added `droppedOffMS` parameter
   - Returns faster decay multipliers when `droppedOffMS = true`

2. **`calculateCurrentScore(baseScore, firstDetected, pageViews, clicks, droppedOffMS)`**
   - Added `droppedOffMS` parameter
   - Enforces minimum score of 50: `Math.max(50, score)`

3. **`processAmazonData()` in `collect-amazon.ts`**
   - Changed drop-off logic to reduce by 10-15 points instead of setting to 50
   - Passes `droppedOffMS = true` to `calculateCurrentScore()`

4. **`recalculateAllScores()` in `trending-products.ts`**
   - Detects dropped M&S products: `onMoversShakers === false && lastSeenOnMoversShakers !== null`
   - Passes `droppedOffMS` flag to `calculateCurrentScore()`

## Example Scenarios

### Scenario 1: Product Drops Off M&S (Day 1)
- **Before drop-off**: Base score 100, current score 100
- **After drop-off**: Base score 88 (reduced by 12), current score 79 (88 × 0.9)
- **With traffic boost**: Could be 85-90 points

### Scenario 2: Product Drops Off M&S (Day 5)
- **Before drop-off**: Base score 100, current score 85 (100 × 0.85)
- **After drop-off**: Base score 88 (reduced by 12), current score 57 (88 × 0.65)
- **With traffic boost**: Could be 65-70 points

### Scenario 3: Product Drops Off M&S (Day 15)
- **Before drop-off**: Base score 100, current score 50 (100 × 0.5)
- **After drop-off**: Base score 88 (reduced by 12), current score 44 (88 × 0.5)
- **With traffic boost**: Could be 50-55 points
- **Over time**: Will continue to decay gradually to zero

## Benefits

1. **No Huge Daily Swings**: Products don't instantly drop 50 points (100 → 50 in one day)
2. **Gradual Decay**: Products reduce by 10-15 points when dropping off M&S, then decay gradually
3. **Faster Decay**: Dropped products decay faster to keep homepage fresh
4. **Natural Lifecycle**: Products can eventually decay to zero over time (weeks/months)
5. **Traffic Boost**: Popular products can maintain higher scores through engagement

## Testing

To test the changes:
1. Run Amazon collection: `npm run collect:amazon`
2. Check products that dropped off M&S - they should have base scores reduced by 10-15 points
3. Run daily update: `npm run daily-update`
4. Verify scores never go below 50
5. Verify dropped products decay faster than products still on M&S

