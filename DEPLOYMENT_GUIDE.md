# RentMate Deployment & Verification Protocol

> 🚨 **CRITICAL RULE**: Every deployment (whether code push or manual deploy) **MUST** be followed by immediate verification and a status update to the user.

## 1. Frontend / General Deployment (Netlify)

The frontend deploys automatically via Git Push to `main`.

### Protocol
1.  **Push Changes**: `git push origin main`
2.  **Wait**: Allow 3-5 minutes for Netlify to build.
3.  **VERIFY (Mandatory)**:
    - **Step A**: Check Build Version
        - Visit: `https://rentmate.co.il/version.json`
        - Action: Compare `timestamp` and `shortVersion` with your latest local commit.
        - *If dates don't match, the deploy hasn't happened yet.*
    - **Step B**: Visual Check
        - Visit: `https://rentmate.co.il`
        - Action: Confirm the specific features (e.g., new buttons, bug fixes) are visible.
        - Action: Check Console for errors.
4.  **NOTIFY USER (Mandatory)**:
    - Send a message confirming:
        - ✅ Deployment Status (Success/Fail)
        - 📌 Version Hash
        - 🔍 Verified Features

---

## 2. Backend: Edge Functions & Cron Jobs (Index Updates)

### Prerequisites
- [ ] Supabase CLI installed (`npm install -g supabase`)
- [ ] Authenticated with Supabase (`supabase login`)
- [ ] Project linked (`supabase link --project-ref YOUR_PROJECT_REF`)

### Step 1: Deploy Edge Function

```bash
# Deploy the fetch-index-data function to production
supabase functions deploy fetch-index-data

# Verify deployment
supabase functions list
```

### Step 2: Test the Edge Function

```bash
# Test the function manually (replace with your project URL)
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/fetch-index-data' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json'
```

Expected response:
```json
{
  "success": true,
  "records_processed": 5,
  "errors": []
}
```

### Step 3: Configure Database Settings (Required for Cron)

Run these SQL commands in your Supabase SQL Editor:

```sql
-- Set your Supabase URL
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://YOUR_PROJECT_REF.supabase.co';

-- Set your service role key (get from Supabase Dashboard > Settings > API)
ALTER DATABASE postgres SET app.settings.service_role_key = 'YOUR_SERVICE_ROLE_KEY';
```

### Step 4: Apply Cron Job Migration

```bash
# Push the migration to production
supabase db push

# Or apply specific migration
supabase migration up --db-url YOUR_DATABASE_URL
```

### Step 5: Verify Cron Job

Run in SQL Editor:

```sql
-- Check if job is scheduled
SELECT * FROM cron.job WHERE jobname = 'monthly-index-update';

-- Check job run history (after first run)
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'monthly-index-update')
ORDER BY start_time DESC 
LIMIT 10;
```

### Step 6: Manual Test (Optional)

Trigger the job manually to test:

```sql
-- Run the job immediately
SELECT cron.schedule_in_database(
    'test-index-update',
    '* * * * *',  -- Run every minute (for testing)
    $$
    SELECT net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/fetch-index-data',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body := '{}'::jsonb
    );
    $$
);

-- Wait a minute, then check if it ran
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 1;

-- Remove test job
SELECT cron.unschedule('test-index-update');
```

## Monitoring

### Check Function Logs
1. Go to Supabase Dashboard
2. Navigate to Edge Functions > fetch-index-data
3. View Logs tab

### Check Index Data
```sql
-- Verify data is being updated
SELECT index_type, MAX(date) as latest_date, COUNT(*) as total_records
FROM index_data
GROUP BY index_type
ORDER BY index_type;
```

## Troubleshooting

### If Cron Job Fails
```sql
-- Check error details
SELECT * FROM cron.job_run_details 
WHERE status = 'failed'
ORDER BY start_time DESC;

-- Disable job temporarily
SELECT cron.unschedule('monthly-index-update');

-- Re-enable after fixing
-- (Re-run the migration or schedule command)
```

### If Edge Function Fails
- Check function logs in Supabase Dashboard
- Verify service role key is set correctly
- Test function manually with curl
- Check if external APIs (CBS, BOI) are accessible

## Rollback

If you need to remove the Cron job:

```sql
SELECT cron.unschedule('monthly-index-update');
```

To undeploy the Edge Function:
```bash
supabase functions delete fetch-index-data
```

## Success Criteria
- ✅ Edge Function deploys without errors
- ✅ Manual test of Edge Function succeeds
- ✅ Cron job is visible in `cron.job` table
- ✅ Database settings are configured
- ✅ Index data table shows recent updates
