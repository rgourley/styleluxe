# Cloudflare R2 Setup Guide

## Overview

This project uses Cloudflare R2 to store product images instead of hotlinking Amazon images. This is necessary because:
- Hotlinking Amazon images violates Amazon's Terms of Service
- Amazon can change/remove image URLs, breaking your site
- You need control over your images

## Setup Steps

### 1. Create R2 Bucket

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2** → **Create bucket**
3. Name your bucket (e.g., `beautyfinder-images`)
4. Choose a location (optional, defaults to auto)

### 2. Create API Token

1. Go to **Manage R2 API Tokens** in the R2 section
2. Click **Create API token**
3. Give it a name (e.g., `beautyfinder-upload`)
4. Grant **Object Read & Write** permissions
5. Click **Create API Token**
6. **Save the credentials** - you'll need:
   - Access Key ID
   - Secret Access Key

### 3. Set Up Public Access

You need to make your R2 bucket publicly accessible:

**Option A: Custom Domain (Recommended)**
1. In your R2 bucket, go to **Settings** → **Public Access**
2. Click **Connect Domain**
3. Add a subdomain (e.g., `images.yourdomain.com`)
4. Follow DNS setup instructions

**Option B: R2.dev Subdomain**
1. In your R2 bucket, go to **Settings** → **Public Access**
2. Enable **R2.dev Subdomain**
3. You'll get a public URL like `https://pub-xxxxx.r2.dev`

### 4. Environment Variables

Add these to your `.env` file:

```env
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
R2_BUCKET_NAME=beautyfinder-images
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
# OR if using custom domain:
# R2_PUBLIC_URL=https://images.yourdomain.com
```

**How to find Account ID:**
- Go to your Cloudflare dashboard
- Click on any domain
- The Account ID is in the right sidebar

### 5. Verify Setup

After setting up, test the configuration:

1. Restart your development server
2. Go to admin panel and scrape a product
3. Check the console logs - you should see "✓ Stored image in R2"
4. Verify the image URL in the database is from your R2 bucket

## How It Works

1. **When scraping Amazon products:**
   - The scraper downloads the product image from Amazon
   - The image is uploaded to your R2 bucket
   - The product's `imageUrl` is updated with the R2 URL
   - Amazon URLs are no longer stored

2. **Image file naming:**
   - Format: `products/product-{productId}-{asin}-{timestamp}.{ext}`
   - Example: `products/product-cm123abc-B0B9YCYRRS-1234567890.jpg`

3. **Benefits:**
   - ✅ Compliant with Amazon's Terms of Service
   - ✅ Images won't break if Amazon changes URLs
   - ✅ Zero egress fees (no bandwidth costs)
   - ✅ Fast global CDN via Cloudflare
   - ✅ Full control over your images

## Troubleshooting

**Error: "R2_BUCKET_NAME environment variable is not set"**
- Make sure all R2 environment variables are set in `.env`
- Restart your development server after adding them

**Error: "Access Denied" or "403 Forbidden"**
- Check that your API token has read & write permissions
- Verify the bucket name is correct
- Make sure the endpoint URL is correct

**Images are uploaded but not publicly accessible:**
- Make sure you've set up public access (custom domain or R2.dev subdomain)
- Check that `R2_PUBLIC_URL` matches your public access URL
- Verify the bucket is configured for public read access

**Images not showing on site:**
- Check that `R2_PUBLIC_URL` is set correctly
- Verify the image URL in the database starts with your `R2_PUBLIC_URL`
- Check browser console for CORS errors (may need to configure CORS in R2)

## Migration

Existing products with Amazon image URLs will be migrated automatically when you:
1. Re-scrape them via the admin panel
2. Run the batch scraping script

To migrate all existing products, you can create a migration script that:
1. Finds all products with Amazon image URLs
2. Downloads and uploads them to R2
3. Updates the product records

## Cost

Cloudflare R2 pricing (as of 2024):
- **Storage**: $0.015 per GB/month
- **Class A Operations** (write/delete): $4.50 per million
- **Class B Operations** (read): $0.36 per million
- **Egress**: FREE (unlimited)

Free tier: 10 GB storage, 1M Class A operations/month

For a typical site with 1000 products (~2GB images):
- Monthly cost: ~$0.03 (storage) + minimal operation costs
- **Total: ~$0.05-0.10/month** (very affordable!)

