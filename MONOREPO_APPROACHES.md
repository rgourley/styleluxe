# Monorepo Migration Approaches

## ✅ **RECOMMENDED: Same Repo, New Branch**

### How it works:
1. Create a branch from your current `main`
2. Do all monorepo work in that branch
3. Test locally and on Vercel preview
4. Merge to `main` when ready
5. Environment variables stay in Vercel project

### Steps:
```bash
# In your current repo
git checkout -b monorepo-migration
# Do all the monorepo work here
# Test locally
# Deploy to Vercel preview (uses same env vars)
```

### Vercel Setup:
- Same Vercel project
- Same environment variables ✅ (no loss!)
- Create a preview deployment from the branch
- Test everything works
- Merge to main when ready

**Pros:**
- ✅ Keep all environment variables
- ✅ Same repo, easy to compare
- ✅ Easy rollback (just switch branch)
- ✅ Can use Vercel preview deployments

**Cons:**
- ⚠️ Branch gets messy during migration
- ⚠️ Need to be careful not to push breaking code to main

---

## Option 2: New Repo (What you're thinking)

### How it works:
1. Clone to new directory locally
2. Create new GitHub repo
3. Push to new repo
4. Create new Vercel project
5. Copy environment variables manually

### Steps:
```bash
# Clone locally
cd ~/Documents
git clone git@github.com:rgourley/styleluxe.git styleluxe-monorepo
cd styleluxe-monorepo

# Change remote to new repo (or create new repo first)
git remote set-url origin git@github.com:rgourley/styleluxe-monorepo.git
# Or keep old remote, add new one, etc.
```

### Vercel Setup:
- Create NEW Vercel project
- Point to new repo
- **Manually copy all environment variables** ⚠️
- New project URL (can add custom domain later)

**Pros:**
- ✅ Completely separate
- ✅ Can experiment freely
- ✅ Original project untouched

**Cons:**
- ⚠️ **Must manually copy all environment variables**
- ⚠️ New Vercel project (new URL initially)
- ⚠️ Two repos to manage
- ⚠️ Lose git history connection

---

## ✅ **BEST APPROACH: Same Repo, Branch + Vercel Preview**

### Why this is best:

1. **Environment Variables:**
   - ✅ Stay in your existing Vercel project
   - ✅ No manual copying needed
   - ✅ Preview deployments use same vars

2. **Deployment:**
   - Create preview deployment from branch
   - Test on `beautyfinder-monorepo-*.vercel.app`
   - Switch main branch in Vercel when ready
   - Or merge to main and auto-deploy

3. **Rollback:**
   - Switch branch in Vercel
   - Or `git checkout main` locally
   - Instant rollback

4. **Testing:**
   - Test locally on branch
   - Test on Vercel preview URL
   - Everything works before merging

### Detailed Steps:

```bash
# 1. Create branch
git checkout -b monorepo-migration
git push -u origin monorepo-migration

# 2. Do monorepo work in branch
# ... restructure, move files, etc.

# 3. Test locally
npm install
npm run dev

# 4. Commit and push
git add .
git commit -m "Monorepo structure"
git push

# 5. Vercel will create preview deployment automatically
# Test at: https://beautyfinder-git-monorepo-migration-*.vercel.app

# 6. When ready, merge to main
git checkout main
git merge monorepo-migration
git push

# 7. Vercel auto-deploys from main
# Your production site updates!
```

---

## Environment Variables: What Happens?

### Same Repo, Branch Approach:
- ✅ **All environment variables stay in Vercel**
- ✅ Preview deployments use the same vars
- ✅ No manual copying needed
- ✅ Production vars stay safe

### New Repo Approach:
- ⚠️ **Must manually copy all variables**
- ⚠️ Easy to miss one
- ⚠️ Have to set up all secrets again
- ⚠️ Risk of typos/copy errors

### Environment Variables to Copy (if going new repo):
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `ANTHROPIC_API_KEY`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `R2_ACCOUNT_ID`
- `R2_BUCKET_NAME`
- `NEXT_PUBLIC_SITE_URL`
- `NEXTAUTH_URL`
- `CRON_SECRET`
- `AMAZON_PAAPI_ACCESS_KEY`
- `AMAZON_PAAPI_SECRET_KEY`
- `AMAZON_PAAPI_ASSOCIATE_TAG`
- ... and any others

**That's a lot to copy!** Better to use same repo/branch approach.

---

## My Recommendation:

### ✅ **Use Same Repo + Branch Approach**

**Why:**
1. **No environment variable copying** - biggest win!
2. Easy rollback
3. Same Vercel project
4. Preview deployments for testing
5. Keep git history

**Workflow:**
```bash
# 1. Create branch (safe, can abandon)
git checkout -b monorepo-migration

# 2. Do work in branch
# ... monorepo setup ...

# 3. Test locally
npm run dev

# 4. Push, Vercel creates preview
git push

# 5. Test preview deployment
# Visit: https://beautyfinder-git-monorepo-migration-*.vercel.app

# 6. If good, merge to main
git checkout main
git merge monorepo-migration
git push
# Production auto-updates!

# 7. If bad, just stay on main
git checkout main
# Branch stays there, can delete later
```

---

## What About Cursor/IDE?

- **Same repo:** Cursor just opens the repo, switch branches
- **New repo:** Open new folder in Cursor
- Either way works, but same repo is simpler

---

## Final Answer:

**Use the SAME repo with a BRANCH.**

You'll:
- ✅ Keep all environment variables
- ✅ Use Vercel preview deployments
- ✅ Easy rollback
- ✅ Same git history
- ✅ Can test before production

You won't:
- ❌ Lose environment variables
- ❌ Need to create new Vercel project
- ❌ Need to copy secrets manually
- ❌ Create new GitHub repo

