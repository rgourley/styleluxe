# Google OAuth Setup Guide

## ✅ **Code is Ready!**

The NextAuth configuration has been updated to automatically:
- Create users in the database when they sign in with Google for the first time
- Link Google accounts to existing users
- Assign admin role to Google sign-ins
- Store account information for future logins

---

## Step 1: Create Google OAuth Credentials

1. **Go to Google Cloud Console:**
   - Visit https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create or Select a Project:**
   - Click the project dropdown at the top
   - Click "New Project"
     - Name it (e.g., "Beauty Finder Admin")
   - Click "Create"

3. **Enable Google+ API (or People API):**
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" or "People API"
   - Click on it and click "Enable"

4. **Configure OAuth Consent Screen:**
   - Go to "APIs & Services" > "OAuth consent screen"
   - Choose "External" (unless you have a Google Workspace)
   - Fill in required fields:
     - App name: "Beauty Finder Admin"
     - User support email: your email (rgourley@gmail.com)
     - Developer contact: your email
   - Click "Save and Continue"
   - Add scopes: Keep defaults (userinfo.email, userinfo.profile)
   - Add test users: Add your email (rgourley@gmail.com)
   - Click "Save and Continue" through the remaining steps

5. **Create OAuth Client ID:**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Application type: "Web application"
     - Name: "Beauty Finder Admin"
   
   - **Authorized JavaScript origins:**
     ```
     http://localhost:3000
     https://beautyfinder.io
     ```
   
   - **Authorized redirect URIs:**
     ```
     http://localhost:3000/api/auth/callback/google
     https://beautyfinder.io/api/auth/callback/google
     ```
   
   - Click "Create"

6. **Copy Your Credentials:**
   - You'll see a popup with:
     - **Client ID** (e.g., `123456789-abcdefg.apps.googleusercontent.com`)
     - **Client Secret** (e.g., `GOCSPX-...`)
   - **Copy both** - you'll need them in the next step

---

## Step 2: Add Environment Variables

### **Local Development (.env file):**

Add these to your `.env` file:

```env
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
```

### **Production (Vercel):**

1. Go to your Vercel project dashboard
2. Go to **Settings** > **Environment Variables**
3. Add:
   - **Name:** `GOOGLE_CLIENT_ID`
   - **Value:** your client ID
   - **Environment:** Production (and Preview if you want)
   - Click "Save"
4. Add:
   - **Name:** `GOOGLE_CLIENT_SECRET`
   - **Value:** your client secret
   - **Environment:** Production (and Preview if you want)
   - Click "Save"

---

## Step 3: Restart Your Dev Server

After adding the environment variables:

```bash
# Stop your dev server (Ctrl+C)
# Then restart it
npm run dev
```

---

## Step 4: Test Google Sign-In

1. Go to `/admin/login`
2. Click "Sign in with Google"
3. You should be redirected to Google
4. Sign in with your Google account (rgourley@gmail.com)
5. You should be redirected back to `/admin`

**First time:** A user account will be automatically created in your database with admin role.

---

## Troubleshooting

### ❌ Error: "redirect_uri_mismatch"
**Solution:**
- Make sure the redirect URI in Google Console **exactly** matches: 
  - `http://localhost:3000/api/auth/callback/google` (for localhost)
  - `https://beautyfinder.io/api/auth/callback/google` (for production)
- Check for trailing slashes or http vs https
- Make sure you added **both** URIs if testing both environments

### ❌ Error: "invalid_client"
**Solution:**
- Double-check your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`
- Make sure there are **no extra spaces or quotes**
- Restart your dev server after adding them
- In production, make sure you added them to Vercel environment variables

### ❌ Error: "access_denied" or "Error 400"
**Solution:**
- Your app might be in "Testing" mode
- Add your email as a test user in OAuth consent screen
- Or publish your app (but this requires verification)

### ❌ User not created after Google sign-in
**Solution:**
- Check your database connection
- Check server logs for errors
- The code should automatically create users - this shouldn't happen

---

## Important Notes

### **Localhost vs Production:**
- You can use the **same** OAuth credentials for both
- Just make sure to add **both** redirect URIs in Google Console
- Localhost: `http://localhost:3000/api/auth/callback/google`
- Production: `https://beautyfinder.io/api/auth/callback/google`

### **Test Users:**
- If your app is in "Testing" mode, only test users can sign in
- Add test users in "OAuth consent screen" > "Test users"
- Add: `rgourley@gmail.com`

### **Publishing Your App:**
- To allow anyone with a Google account to sign in, you need to publish your app
- This requires Google verification (can take a few days)
- For now, "Testing" mode with test users is fine

---

## What Happens When You Sign In

1. Click "Sign in with Google"
2. Redirected to Google → Sign in
3. Google redirects back to your app
4. NextAuth callback runs:
   - Checks if user exists in database (by email)
   - If not, creates new user with admin role
   - Links Google account to user
   - Creates session
5. You're logged in and redirected to `/admin`

---

## Security

✅ **Secure:** Google OAuth is industry-standard  
✅ **Automatic:** Users are created automatically  
✅ **Admin Role:** Google sign-ins automatically get admin role  
✅ **Account Linking:** Google accounts are linked to database users

---

## You're All Set! 🎉

Once you add the environment variables and restart your server, Google sign-in will work!
