# 🔧 Fix: "Database error creating new user"

## Problem
You're getting this error because the **database migration hasn't been run yet**. The system is trying to create a user profile, but the `user_profiles` table doesn't exist.

---

## ✅ Quick Fix (5 minutes)

### Step 1: Run the Migration

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your RentMate project

2. **Open SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "+ New query"

3. **Run the Migration**
   - Open the file: `admin-role-migration.sql` from your RentMate folder
   - Copy **ALL** the contents (Ctrl+A, Ctrl+C)
   - Paste into Supabase SQL Editor
   - Click **"Run"** button (or press Ctrl+Enter)
   - Wait 2-3 seconds for completion

4. **Verify Success**
   You should see output messages like:
   ```
   ✅ Admin role system migration completed successfully!
   📊 Tables created: user_profiles, audit_logs
   🔧 Functions created: is_admin(), get_user_role(), ...
   ```

### Step 2: Test User Creation

1. Go back to your signup page
2. Try creating a new user again
3. Should work now! ✅

---

## 🔍 Verify Migration Worked

Run this in Supabase SQL Editor:

```sql
-- Check if user_profiles table exists
SELECT COUNT(*) FROM user_profiles;

-- Should return: 0 (or number of existing profiles)
-- If error "relation user_profiles does not exist" → migration didn't run
```

---

## ⚠️ Still Getting Errors?

### Error: "relation user_profiles does not exist"
**Cause:** Migration didn't run  
**Fix:** Go back to Step 1 and run the migration again

### Error: "duplicate key value violates unique constraint"
**Cause:** User already exists  
**Fix:** Use a different email or delete the existing user

### Error: "permission denied for table user_profiles"
**Cause:** RLS policies are blocking  
**Fix:** This shouldn't happen with the migration, but if it does:

```sql
-- Temporarily disable RLS to test
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Try creating user again

-- Re-enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
```

---

## 🎯 What the Migration Does

When you run `admin-role-migration.sql`, it:

1. ✅ Creates `user_profiles` table
2. ✅ Creates `audit_logs` table  
3. ✅ Sets up auto-trigger to create profile when user signs up
4. ✅ Configures RLS policies
5. ✅ Creates helper functions (is_admin, get_user_role, etc.)

**Without this migration, user signup will fail!**

---

## 📞 Need Help?

If you're still stuck after running the migration:

1. **Check Supabase logs:**
   - Supabase Dashboard → Logs → Database
   - Look for error messages

2. **Verify trigger exists:**
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```
   Should return 1 row

3. **Check if function exists:**
   ```sql
   SELECT * FROM pg_proc WHERE proname = 'create_user_profile';
   ```
   Should return 1 row

---

## ✅ After Migration Works

Once the migration is successful:

1. Create your first user account
2. Promote yourself to admin:
   ```sql
   UPDATE user_profiles 
   SET role = 'admin' 
   WHERE email = 'your-email@example.com';
   ```

3. Continue with the rest of the implementation!

---

**TL;DR:** Run `admin-role-migration.sql` in Supabase SQL Editor, then try signup again.
