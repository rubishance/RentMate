# Fix for "User Already Registered" Issue

## Problem
User `info@rentmate.co.il` exists in `auth.users` but not in `user_profiles` table, causing "user already registered" error on signup attempts.

## Root Cause
The signup trigger `handle_new_user()` had `ON CONFLICT (id) DO NOTHING` which silently failed when trying to create a profile for an existing auth user.

## Solution

### Step 1: Fix Existing Orphaned Users
Run this migration to create missing profiles for all orphaned users:

```bash
# Navigate to Supabase SQL Editor
# https://supabase.com/dashboard/project/qfvrekvugdjnwhnaucmz/sql/new

# Copy and paste the contents of:
# supabase/migrations/fix_orphaned_users.sql
```

**OR** use Supabase CLI:
```bash
cd "c:\AnitiGravity Projects\RentMate"
npx supabase db push --db-url "postgresql://postgres:[YOUR-PASSWORD]@db.qfvrekvugdjnwhnaucmz.supabase.co:5432/postgres"
```

### Step 2: Improve Signup Trigger
Run this migration to prevent future orphaned users:

```bash
# In Supabase SQL Editor, run:
# supabase/migrations/20260121_improved_signup_trigger.sql
```

### Step 3: Verify the Fix

1. **Check if profile was created:**
   ```sql
   SELECT id, email, full_name, role, plan_id 
   FROM user_profiles 
   WHERE email = 'info@rentmate.co.il';
   ```

2. **Try signing in:**
   - Go to the login page
   - Enter: `info@rentmate.co.il` and the password you used
   - Should now work!

3. **If you forgot the password:**
   - Click "Forgot Password"
   - Enter `info@rentmate.co.il`
   - Check your email for reset link

## Alternative: Delete and Re-register

If you prefer to start fresh:

```sql
-- Delete from auth.users (this will cascade to user_profiles if it exists)
DELETE FROM auth.users WHERE email = 'info@rentmate.co.il';
```

Then try signing up again with the same email.

## What Changed

### Before (Broken):
```sql
INSERT INTO user_profiles (...)
VALUES (...)
ON CONFLICT (id) DO NOTHING;  -- ❌ Silently fails!
```

### After (Fixed):
```sql
INSERT INTO user_profiles (...)
VALUES (...)
ON CONFLICT (id) DO UPDATE SET  -- ✅ Updates existing profile
    email = EXCLUDED.email,
    updated_at = NOW();
```

## Files Created
1. `supabase/migrations/fix_orphaned_users.sql` - Fixes existing orphaned users
2. `supabase/migrations/20260121_improved_signup_trigger.sql` - Prevents future issues
