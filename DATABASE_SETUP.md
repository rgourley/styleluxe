# Database Setup Guide

## The Error

You're seeing: `Can't reach database server at localhost:51214`

This means your database isn't accessible or the connection string is incorrect.

## Quick Fix Options

### Option 1: Use Neon (Free PostgreSQL - Recommended)

1. Go to https://neon.tech and sign up (free)
2. Create a new project
3. Copy your connection string (looks like: `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/dbname`)
4. Update your `.env` file:
   ```
   DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/dbname"
   ```

### Option 2: Use Local PostgreSQL

If you have PostgreSQL installed locally:

1. Make sure PostgreSQL is running:
   ```bash
   # On Mac
   brew services start postgresql
   
   # Or check if running
   pg_isready
   ```

2. Create a database:
   ```bash
   createdb styleluxe
   ```

3. Update `.env`:
   ```
   DATABASE_URL="postgresql://localhost:5432/styleluxe"
   ```

### Option 3: Use Supabase (Free Alternative)

1. Go to https://supabase.com and sign up
2. Create a new project
3. Go to Settings > Database
4. Copy the connection string
5. Update your `.env` file

## After Setting Up Database

1. **Push the schema:**
   ```bash
   npm run db:push
   ```

2. **Verify it worked:**
   ```bash
   npx prisma studio
   ```
   (This opens a database viewer in your browser)

3. **Try data collection again:**
   - Go to `/admin`
   - Click "Run All Sources Collection"

## Current Issue

Your `DATABASE_URL` is pointing to a database that either:
- Isn't running
- Has the wrong host/port
- Has incorrect credentials

Check your `.env` file and make sure the `DATABASE_URL` is correct for your database provider.


