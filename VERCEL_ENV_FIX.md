# 🚨 CRITICAL: Fix Vercel Environment Variables

You're getting `redirect_uri_mismatch` because NextAuth is using the wrong domain.

## Immediate Action Required

**Go to Vercel and check/update these environment variables:**

### Step 1: Check Current Values

1. Go to: https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Look for these variables and check their values:

### Step 2: Set/Update These Variables

**IMPORTANT:** Set ALL of these in Vercel:

1. **`NEXTAUTH_URL`**
   - Value: `https://beautyfinder.io`
   - Environment: Production, Preview, Development
   - **This is the most critical one!**

2. **`NEXT_PUBLIC_SITE_URL`**
   - Value: `https://beautyfinder.io`
   - Environment: Production, Preview, Development

3. **`GOOGLE_CLIENT_ID`**
   - Value: Your Google OAuth Client ID
   - Environment: Production, Preview, Development

4. **`GOOGLE_CLIENT_SECRET`**
   - Value: Your Google OAuth Client Secret
   - Environment: Production, Preview, Development

### Step 3: Remove Old Values (if they exist)

**Delete or update any of these if they exist:**
- ❌ `NEXTAUTH_URL` = `https://www.thestyleluxe.com` (DELETE or UPDATE)
- ❌ `NEXT_PUBLIC_SITE_URL` = `https://www.thestyleluxe.com` (DELETE or UPDATE)

### Step 4: Redeploy

After updating environment variables:
1. Go to **Deployments** tab
2. Click the **3 dots** (⋯) on the latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete

### Step 5: Verify in Google Cloud Console

Make sure your Google OAuth client has this redirect URI:
- ✅ `https://beautyfinder.io/api/auth/callback/google`

**NOT:**
- ❌ `https://www.thestyleluxe.com/api/auth/callback/google`

---

## Why This Happened

NextAuth uses `NEXTAUTH_URL` to construct the OAuth callback URL. If it's not set or set to the wrong domain, OAuth will fail with `redirect_uri_mismatch`.

Even though the code now has fallbacks, **you MUST set `NEXTAUTH_URL` in Vercel** for it to work correctly in production.

