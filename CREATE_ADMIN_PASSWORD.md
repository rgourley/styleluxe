# Setting Your Admin Password

## Option 1: Use the Script (Recommended)

Run this command to set your password:

```bash
tsx scripts/create-admin-user.ts rgourley@gmail.com "YourPasswordHere" "Robert Gourley"
```

**Replace `"YourPasswordHere"` with your actual password.**

Example:
```bash
tsx scripts/create-admin-user.ts rgourley@gmail.com "MySecurePassword123!" "Robert Gourley"
```

---

## Option 2: Use the API Endpoint

You can also create/update your user via the API:

```bash
curl -X POST http://localhost:3000/api/auth/create-user \
  -H "Content-Type: application/json" \
  -d '{
    "email": "rgourley@gmail.com",
    "password": "YourPasswordHere",
    "name": "Robert Gourley"
  }'
```

**Note:** This endpoint is currently not protected, so only use it in development or add auth protection.

---

## Option 3: Use Google OAuth

If you have Google OAuth configured, you can click "Sign in with Google" on the login page instead of using a password.

---

## Current Status

✅ Your user account exists: `rgourley@gmail.com`  
⚠️ You need to set a password to log in

---

## After Setting Password

1. Go to `/admin/login`
2. Enter your email: `rgourley@gmail.com`
3. Enter the password you just set
4. Click "Sign in"

