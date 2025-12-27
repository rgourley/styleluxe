# Authentication Setup Guide

This project uses **NextAuth.js** (Auth.js) for authentication with support for:
- ✅ Google OAuth (one-click login)
- ✅ Email/Password login

## Quick Setup (5 minutes)

### 1. Add Environment Variables

Add these to your `.env` file:

```env
# NextAuth Secret (generate a random string)
NEXTAUTH_SECRET=your-secret-key-here-change-this-in-production

# Google OAuth (optional - if you want Google login)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Your existing variables...
DATABASE_URL=your-database-url
ANTHROPIC_API_KEY=your-anthropic-key
```

**To generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 2. Set Up Google OAuth (Optional but Recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable "Google+ API"
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Choose "Web application"
6. Add authorized redirect URI:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://yourdomain.com/api/auth/callback/google`
7. Copy the Client ID and Client Secret to your `.env` file

### 3. Create Your First Admin User

**Option A: Email/Password (Recommended for first user)**

```bash
npx tsx scripts/create-admin-user.ts your@email.com yourpassword "Your Name"
```

**Option B: Use Google OAuth**
1. Make sure Google OAuth is configured (step 2)
2. Go to `/admin/login`
3. Click "Sign in with Google"
4. First Google user to log in will automatically be created as admin

### 4. Test Login

1. Go to `http://localhost:3000/admin/login`
2. Try logging in with either:
   - Email/password (if you created a user in step 3)
   - Google OAuth (if configured)

## How It Works

### Protected Routes
- All routes under `/admin/*` are protected by middleware
- Unauthenticated users are redirected to `/admin/login`
- Only users with `admin` or `editor` role can access

### User Roles
- `admin`: Full access (default for created users)
- `editor`: Can access admin panel (you can customize permissions later)

### Database Tables
The authentication system creates these tables:
- `User`: User accounts
- `Account`: OAuth provider accounts (Google, etc.)
- `Session`: Active user sessions
- `VerificationToken`: Email verification tokens

## Security Notes

- Passwords are hashed with bcrypt (10 rounds)
- Sessions are stored as JWTs (stateless)
- Google OAuth users don't need passwords
- Middleware protects all admin routes automatically

## Creating Additional Users

**Via Script:**
```bash
npx tsx scripts/create-admin-user.ts email@example.com password "Name"
```

**Via API (in development only - secure this in production!):**
```bash
curl -X POST http://localhost:3000/api/auth/create-user \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password","name":"User Name"}'
```

## Troubleshooting

**"Invalid credentials" error:**
- Check that user exists: `npx prisma studio` → User table
- Verify password hash matches
- Try creating a new user with the script

**Google OAuth not working:**
- Check redirect URI matches exactly (including http/https, port, trailing slash)
- Verify Client ID and Secret in `.env`
- Check browser console for OAuth errors

**"NEXTAUTH_SECRET missing" warning:**
- Add `NEXTAUTH_SECRET` to your `.env` file
- Generate a new secret: `openssl rand -base64 32`

## Next Steps

- Customize user roles and permissions
- Add email verification (optional)
- Add password reset functionality (optional)
- Customize the login page styling


