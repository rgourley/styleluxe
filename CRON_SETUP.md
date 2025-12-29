# Daily Update Cron Job Setup

This document explains how to set up automated daily updates for the age decay scoring system.

## What the Daily Update Does

The daily update script:
- Recalculates `currentScore` for all products based on age decay
- Updates `daysTrending` for all products
- Updates `peakScore` if current score is higher
- Runs automatically at 6:00 AM every day

## Setup Options

### Option 1: Vercel Cron (Recommended for Vercel Deployments)

If you're deploying to Vercel, the cron job is already configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/daily-update",
      "schedule": "0 6 * * *"
    }
  ]
}
```

**No additional setup needed!** Vercel will automatically call `/api/daily-update` at 6:00 AM UTC every day.

### Option 2: System Cron (For Local/Server Deployments)

#### Quick Setup (macOS/Linux)

1. **Run the setup script:**
   ```bash
   ./scripts/setup-cron.sh
   ```

2. **Or manually add to crontab:**
   ```bash
   crontab -e
   ```
   
   Add this line (adjust the path to your project):
   ```cron
   0 6 * * * cd /Users/robert/Documents/styleluxe && /usr/local/bin/tsx scripts/daily-update.ts >> logs/daily-update.log 2>&1
   ```

#### Verify Cron Job

```bash
# View your cron jobs
crontab -l

# Check logs
tail -f logs/daily-update.log
```

### Option 3: GitHub Actions (For CI/CD)

Create `.github/workflows/daily-update.yml`:

```yaml
name: Daily Update

on:
  schedule:
    - cron: '0 6 * * *'  # 6:00 AM UTC daily
  workflow_dispatch:  # Allow manual trigger

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npx tsx scripts/daily-update.ts
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### Option 4: Manual Testing

Run the script manually to test:

```bash
# Using npm script (if added to package.json)
npm run daily-update

# Or directly with tsx
npx tsx scripts/daily-update.ts

# Or using the shell script
./scripts/run-daily-update.sh
```

## Schedule Times

The default schedule is **6:00 AM UTC** (midnight EST, 3:00 AM PST).

To change the time, update the cron expression:
- `0 6 * * *` = 6:00 AM UTC daily
- `0 2 * * *` = 2:00 AM UTC daily (10 PM EST previous day)
- `0 14 * * *` = 2:00 PM UTC daily (10 AM EST)

Cron format: `minute hour day month weekday`

## Monitoring

### Check Logs

```bash
# View recent logs
tail -n 50 logs/daily-update.log

# Follow logs in real-time
tail -f logs/daily-update.log
```

### Test the API Endpoint

```bash
# Test the API endpoint directly
curl -X POST http://localhost:3000/api/daily-update

# Or with authentication (if added)
curl -X POST http://localhost:3000/api/daily-update \
  -H "Authorization: Bearer YOUR_SECRET"
```

## Troubleshooting

### Cron Job Not Running

1. **Check cron service is running:**
   ```bash
   # macOS
   sudo launchctl list | grep cron
   
   # Linux
   sudo systemctl status cron
   ```

2. **Check cron logs:**
   ```bash
   # macOS
   grep CRON /var/log/system.log
   
   # Linux
   grep CRON /var/log/syslog
   ```

3. **Verify script permissions:**
   ```bash
   chmod +x scripts/daily-update.ts
   chmod +x scripts/run-daily-update.sh
   ```

### Environment Variables

Make sure your cron job has access to environment variables:

```bash
# Add to crontab with env vars
0 6 * * * cd /path/to/project && export $(cat .env | xargs) && tsx scripts/daily-update.ts
```

Or use the shell script which handles this automatically.

## Security Note

If you add authentication to the API endpoint, update the cron job to include the secret:

```bash
curl -X POST https://your-domain.com/api/daily-update \
  -H "Authorization: Bearer $CRON_SECRET"
```

Then add `CRON_SECRET` to your environment variables.








