# Google OAuth - Quick Steps

## From the Google Cloud Console Dashboard:

### Step 1: Go to APIs & Services
1. Click on **"APIs & Services"** in the Quick access section (or search for it in the top search bar)
2. Or go to: https://console.cloud.google.com/apis/credentials

### Step 2: Configure OAuth Consent Screen
1. In the left sidebar, click **"OAuth consent screen"**
2. Choose **"External"** (unless you have Google Workspace)
3. Click **"Create"**
4. Fill in:
   - **App name:** Beauty Finder Admin
   - **User support email:** rgourley@gmail.com
   - **Developer contact:** rgourley@gmail.com
5. Click **"Save and Continue"**
6. **Scopes:** Keep defaults, click **"Save and Continue"**
7. **Test users:** Click **"Add Users"**, add `rgourley@gmail.com`, click **"Add"**
8. Click **"Save and Continue"** through remaining steps

### Step 3: Create OAuth Client ID
1. Go back to **"Credentials"** (left sidebar)
2. Click **"Create Credentials"** (top of page)
3. Select **"OAuth client ID"**
4. **Application type:** Web application
5. **Name:** Beauty Finder Admin
6. **Authorized JavaScript origins:**
   - Click **"+ Add URI"**
   - Add: `http://localhost:3000`
   - Click **"+ Add URI"** again
   - Add: `https://www.beautyfinder.io`
7. **Authorized redirect URIs:**
   - Click **"+ Add URI"**
   - Add: `http://localhost:3000/api/auth/callback/google`
   - Click **"+ Add URI"** again
   - Add: `https://www.beautyfinder.io/api/auth/callback/google`
8. Click **"Create"**
9. **Copy both:**
   - Client ID
   - Client Secret

### Step 4: Add to Your .env File (Local)

Open your `.env` file and add:

```env
GOOGLE_CLIENT_ID=paste-your-client-id-here
GOOGLE_CLIENT_SECRET=paste-your-client-secret-here
```

### Step 5: Add to Vercel (Production)

1. Go to your Vercel project dashboard: https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** > **Environment Variables**
4. Add `NEXTAUTH_URL` (IMPORTANT for OAuth):
   - **Name:** `NEXTAUTH_URL`
   - **Value:** `https://beautyfinder.io`
   - **Environment:** Select "Production" (and "Preview" if you want)
   - Click **"Save"**
5. Add `GOOGLE_CLIENT_ID`:
   - **Name:** `GOOGLE_CLIENT_ID`
   - **Value:** paste your client ID
   - **Environment:** Select "Production" (and "Preview" if you want)
   - Click **"Save"**
6. Add `GOOGLE_CLIENT_SECRET`:
   - **Name:** `GOOGLE_CLIENT_SECRET`
   - **Value:** paste your client secret
   - **Environment:** Select "Production" (and "Preview" if you want)
   - Click **"Save"**
7. **Redeploy** your app (Vercel will auto-redeploy, or trigger a new deployment)

### Step 6: Restart Dev Server (Local)

```bash
npm run dev
```

### Step 7: Test

Go to `/admin/login` and click "Sign in with Google"

---

## Direct Links:

- **Credentials:** https://console.cloud.google.com/apis/credentials
- **OAuth Consent Screen:** https://console.cloud.google.com/apis/credentials/consent

