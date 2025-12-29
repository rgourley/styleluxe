# Product Ratings Update Cron Job

## Overview

Automatically updates product ratings, review counts, and prices every 2 weeks via Vercel Cron.

## What It Updates

- **Star Ratings**: Amazon product star ratings (1-5 stars)
- **Review Counts**: Total number of reviews
- **Prices**: Product prices (if changed by 5% or more)
- **Last Scraped Date**: Tracks when each product was last checked

## Schedule

Runs on the **1st and 15th of each month at 2:00 AM UTC** (approximately every 2 weeks).

Cron schedule: `0 2 1,15 * *`

## How It Works

1. **Finds products to update**:
   - Only published products with Amazon URLs
   - Skips products updated in last 10 days
   - Prioritizes high-score products first (score > 70)

2. **Processes in batches**:
   - Processes 50 products per run
   - Rate limits: 1 request per 2 seconds (to avoid Amazon blocks)
   - Total time: ~2 minutes for 50 products

3. **Smart updates**:
   - Only updates if data actually changed
   - Tracks changes (old → new values)
   - Updates `lastScrapedAt` even if no changes

## Vercel Configuration

Already configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/update-product-ratings",
      "schedule": "0 2 1,15 * *"
    }
  ]
}
```

## Manual Testing

Test the endpoint manually:

```bash
# Test locally
curl http://localhost:3000/api/cron/update-product-ratings

# Test on production (with auth if configured)
curl https://your-domain.com/api/cron/update-product-ratings \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Security

Optional: Add `CRON_SECRET` environment variable to protect the endpoint:

1. Add to Vercel environment variables: `CRON_SECRET=your-secret-key`
2. The endpoint will verify the `Authorization: Bearer` header
3. Vercel Cron automatically includes this header

## Monitoring

Check Vercel dashboard → Functions → Cron Jobs to see:
- Last run time
- Success/failure status
- Execution logs

## Adjusting the Schedule

To change the frequency, update `vercel.json`:

```json
// Every week (Sundays)
"schedule": "0 2 * * 0"

// Every month (1st of month)
"schedule": "0 2 1 * *"

// Every 2 weeks (1st and 15th) - current
"schedule": "0 2 1,15 * *"
```

## Adjusting Batch Size

To process more/fewer products per run, edit:
`app/api/cron/update-product-ratings/route.ts`

Change: `take: 50` to your desired number.

**Note**: More products = longer execution time. Vercel has a 5-minute limit for cron jobs.

## Rate Limiting

The job waits 2 seconds between each product to avoid Amazon rate limits. 

If you get blocked:
- Increase the delay (change `2000` to `3000` or `5000`)
- Reduce batch size (process fewer products per run)

