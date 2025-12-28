# Quick R2 Setup Guide

## Step 1: Navigate to R2

1. In Cloudflare Dashboard, look at the left sidebar
2. Under **"Build"** section, click **"Storage & databases"**
3. Click **"R2"**

## Step 2: Create API Token

1. In the R2 page, look for **"Manage R2 API Tokens"** (usually top right or in a menu)
2. Click **"Create API token"**
3. Fill in:
   - **Token name**: `beautyfinder-upload`
   - **Permissions**: Select **"Object Read & Write"**
   - **Bucket**: Select **"beautyfinder"**
4. Click **"Create API token"**
5. **IMPORTANT**: Copy both:
   - **Access Key ID** → This is your `R2_ACCESS_KEY_ID`
   - **Secret Access Key** → This is your `R2_SECRET_ACCESS_KEY`
   - ⚠️ **You can only see the secret once!** Copy it now.

## Step 3: Set Up Public Access

1. In R2, click on your **"beautyfinder"** bucket
2. Click **"Settings"** tab
3. Scroll to **"Public Access"** section
4. You have two options:

   **Option A: R2.dev Subdomain (Easiest)**
   - Click **"Allow Access"** next to "R2.dev Subdomain"
   - You'll get a URL like `https://pub-xxxxx.r2.dev`
   - Copy this URL → This is your `R2_PUBLIC_URL`

   **Option B: Custom Domain (Better for Production)**
   - Click **"Connect Domain"**
   - Enter a subdomain (e.g., `images.beautyfinder.io`)
   - Follow DNS setup instructions
   - Use this URL for `R2_PUBLIC_URL`

## Step 4: Add to .env

Add these to your `.env` file:

```env
# Cloudflare R2
R2_ACCOUNT_ID=2c3e132667c33997783c82dc6453e902
R2_ACCESS_KEY_ID=paste-your-access-key-id-here
R2_SECRET_ACCESS_KEY=paste-your-secret-access-key-here
R2_BUCKET_NAME=beautyfinder
R2_ENDPOINT=https://2c3e132667c33997783c82dc6453e902.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

Replace:
- `paste-your-access-key-id-here` → The Access Key ID from Step 2
- `paste-your-secret-access-key-here` → The Secret Access Key from Step 2
- `https://pub-xxxxx.r2.dev` → The public URL from Step 3

## Step 5: Test

1. Restart your development server
2. Go to admin panel and scrape a product
3. Check console logs for: `✓ Stored image in R2: https://...`
4. Done! 🎉

