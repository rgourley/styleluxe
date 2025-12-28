# Environment Variables Setup

## Required Environment Variables

Add these to your `.env` file:

```env
# Database
DATABASE_URL="postgresql://user:password@host:port/database"

# Anthropic API (for content generation)
ANTHROPIC_API_KEY="sk-ant-..."

# Cloudflare R2 (for image storage)
R2_ACCOUNT_ID=2c3e132667c33997783c82dc6453e902
R2_ACCESS_KEY_ID=your-access-key-id-here
R2_SECRET_ACCESS_KEY=your-secret-access-key-here
R2_BUCKET_NAME=beautyfinder
R2_ENDPOINT=https://2c3e132667c33997783c82dc6453e902.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

## Getting R2 Credentials

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2** → **Manage R2 API Tokens**
3. Click **Create API token**
4. Give it a name (e.g., `beautyfinder-upload`)
5. Grant **Object Read & Write** permissions
6. Select your bucket: `beautyfinder`
7. Click **Create API Token**
8. Copy the **Access Key ID** and **Secret Access Key**

## Setting Up Public Access for R2

You need to make your bucket publicly accessible so images can be served:

1. In Cloudflare Dashboard, go to **R2** → **beautyfinder** bucket
2. Go to **Settings** → **Public Access**
3. Choose one:

   **Option A: R2.dev Subdomain (Easiest)**
   - Enable **R2.dev Subdomain**
   - You'll get a URL like `https://pub-xxxxx.r2.dev`
   - Copy this URL to `R2_PUBLIC_URL` in `.env`

   **Option B: Custom Domain (Better for Production)**
   - Click **Connect Domain**
   - Add a subdomain (e.g., `images.yourdomain.com`)
   - Follow DNS setup instructions
   - Use this URL in `R2_PUBLIC_URL`

## Verifying Setup

After adding all environment variables:

1. Restart your development server
2. Try scraping a product in the admin panel
3. Check console logs for: `✓ Stored image in R2: https://...`
4. Verify the image URL in the database starts with your `R2_PUBLIC_URL`

## Current Configuration

Based on your endpoint, your setup should be:
- **Account ID**: `2c3e132667c33997783c82dc6453e902`
- **Bucket Name**: `beautyfinder`
- **Endpoint**: `https://2c3e132667c33997783c82dc6453e902.r2.cloudflarestorage.com`

Just add your `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_PUBLIC_URL` to `.env`!

