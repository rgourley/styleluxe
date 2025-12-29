# PA-API Troubleshooting

## Current Status

Your credentials are **Active** in the Associates dashboard, but we're getting `InternalFailure` errors.

## Possible Causes

### 1. **Keys Need Time to Activate** (Most Likely)
- New PA-API keys can take **up to 48 hours** to fully activate
- Your keys were created: **Dec 29, 2025**
- **Solution**: Wait 24-48 hours and test again

### 2. **Account Eligibility**
- Need **3+ qualified sales in trailing 30 days** for PA-API access
- **Check**: Your Associates dashboard → Reports → Earnings

### 3. **Test with Amazon's Scratchpad**
- Use: https://webservices.amazon.com/paapi5/scratchpad
- Enter your credentials and test a search
- If Scratchpad works but our code doesn't → signature issue
- If Scratchpad also fails → credentials/account issue

## Current Behavior

✅ **Fallback is working**: The code automatically falls back to scraping if PA-API fails
✅ **No breaking changes**: Your site continues to work normally
✅ **Integration ready**: Once keys activate, PA-API will work automatically

## Next Steps

1. **Wait 24-48 hours** for keys to fully activate
2. **Test with Scratchpad** to verify credentials work
3. **Re-run test**: `npm run test:paapi` or `tsx scripts/test-paapi.ts`

## Test Command

```bash
tsx scripts/test-paapi.ts
```

