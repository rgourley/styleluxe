# Data Collection Scripts

Scripts to collect trending beauty product data from various sources.

## Available Scripts

### Reddit Collection (`collect-reddit.ts`) ✅

Scrapes **top posts from the past week** from beauty-related subreddits:

**Primary (MVP - Start with these):**
- r/SkincareAddiction (1.4M members - skincare)
- r/MakeupAddiction (4.7M members - makeup)
- r/AsianBeauty (567K members - K-beauty)

**Secondary (Add as needed):**
- r/BeautyGuruChatter (417K - influencer trends)
- r/30PlusSkinCare (282K - anti-aging)
- r/Sephora (223K - retail trends)
- r/HaircareScience (473K - hair products)
- r/curlyhair (400K+ - curly hair products)

**Usage:**
```bash
npm run collect:reddit
```

**What it does:**
1. Fetches top weekly posts (limit 25) from each subreddit (no auth needed)
2. Extracts product names using brand detection
3. Calculates trend scores using Reddit scoring system:
   - Post with product + >500 upvotes = 30pts
   - Post with product + 300-500 upvotes = 20pts
   - Product in top comments = 10pts
   - Product mentioned 5+ times = +15pts
4. Stores products with score > 60 (flagged for review generation)

### Amazon Movers & Shakers (`collect-amazon.ts`) ✅

Scrapes Amazon's Movers & Shakers beauty section for products with biggest sales rank jumps.

**URL:** `https://www.amazon.com/gp/movers-and-shakers/beauty`

**Usage:**
```bash
npm run collect:amazon
```

**What it does:**
1. Fetches the Movers & Shakers beauty page
2. Extracts product names, prices, images, URLs, and sales jump percentages
3. Calculates trend scores based on sales jump %:
   - >1000% = 40pts
   - 500-1000% = 30pts
   - 200-500% = 20pts
4. Stores products with score > 60 (flagged for review generation)

**Note:** Amazon's HTML structure may change. For production, consider:
- Using Amazon Product Advertising API (official, requires Associates account)
- Using a headless browser for dynamic content
- Using a scraping service

### Google Trends (`collect-google-trends.ts`) ✅

Tracks trending beauty searches from Google Trends RSS feed.

**Usage:**
```bash
npm run collect:trends
```

**What it does:**
1. Fetches Google Trends RSS feed for trending searches
2. Filters for beauty-related terms
3. Creates/updates products based on trending searches
4. Stores trend signals in database

**Note:** For more accurate tracking, consider using:
- `pytrends` Python library for specific product searches
- Google Trends API (requires API key)

### Main Collection Script (`collect-data.ts`)

Runs all data collection sources together.

**Usage:**
```bash
npm run collect:data
```

This runs:
1. Reddit collection
2. Amazon Movers & Shakers
3. Google Trends

## Running on a Schedule

To run automatically, you can:

1. **Use a cron job:**
```bash
# Run daily at 9 AM
0 9 * * * cd /path/to/styleluxe && npm run collect:data
```

2. **Use GitHub Actions** (if repo is on GitHub):
   - Create `.github/workflows/collect-data.yml`
   - Runs on schedule

3. **Use Vercel Cron:**
   - Set up API route that calls the script
   - Use Vercel's cron feature

## Scoring & Thresholds

**Threshold:** Products with trend score **> 60** are automatically flagged for review generation.

**Amazon Scoring:**
- >1000% sales jump = 40pts
- 500-1000% = 30pts
- 200-500% = 20pts

**Reddit Scoring:**
- Post with product + >500 upvotes = 30pts
- Post with product + 300-500 upvotes = 20pts
- Product in top comments = 10pts
- Product mentioned 5+ times = +15pts

## Notes

- Reddit API doesn't require authentication for reading public data
- Amazon scraping may need adjustments if their HTML structure changes
- Google Trends RSS is free but limited - consider pytrends for more data
- Be respectful with rate limits
- Consider caching to avoid hitting APIs too frequently
- **MVP:** Start with Amazon + top 3 Reddit sources, add others as needed
