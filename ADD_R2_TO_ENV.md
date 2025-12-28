# Add R2 Credentials to .env

Add these lines to your `.env` file (create it if it doesn't exist):

```env
# Cloudflare R2 (for image storage)
R2_ACCOUNT_ID=2c3e132667c33997783c82dc6453e902
R2_ACCESS_KEY_ID=1bc3e3996700082dfe015585c64a3a40
R2_SECRET_ACCESS_KEY=1928977ce30ff313c700b2b43a1cccadf8ad0266b7119d28926bf7b620918926
R2_BUCKET_NAME=beautyfinder
R2_ENDPOINT=https://2c3e132667c33997783c82dc6453e902.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://pub-d1a736a183e147f2a90c487f7e6a4f9f.r2.dev
```

## Quick Steps:

1. Open your `.env` file (in the root of your project)
2. Add the R2 configuration above
3. Save the file
4. Restart your development server
5. Test by scraping a product in the admin panel

## Test It:

1. Restart your dev server: `npm run dev`
2. Go to admin panel
3. Scrape a product
4. Check console logs for: `✓ Stored image in R2: https://pub-d1a736a183e147f2a90c487f7e6a4f9f.r2.dev/...`
5. Done! 🎉

