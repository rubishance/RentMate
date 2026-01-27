-- Comprehensive Fix for "Failed to Update Profile"

DO $$ 
BEGIN
    -- 1. Ensure Columns Exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'first_name') THEN
        ALTER TABLE public.user_profiles ADD COLUMN first_name TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'last_name') THEN
        ALTER TABLE public.user_profiles ADD COLUMN last_name TEXT;
    END IF;

    -- 2. Populate NULLs (Safety Check)
    UPDATE public.user_profiles
    SET 
        first_name = COALESCE(full_name, 'User'),
        last_name = 'aaa'
    WHERE first_name IS NULL OR last_name IS NULL;

    -- 3. Reset RLS Policies for user_profiles (The Nuclear Option for Permissions)
    -- First, ensure RLS is on
    ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

    -- Drop potentially conflicting policies
    DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
    DROP POLICY IF EXISTS "Users update own" ON public.user_profiles;
    DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
    DROP POLICY IF EXISTS "Users view own" ON public.user_profiles;

    -- Re-create Standard Policies
    
    -- SELECT
    CREATE POLICY "Users view own"
    ON public.user_profiles FOR SELECT
    USING (auth.uid() = id);

    -- UPDATE (Explicitly Allow)
    CREATE POLICY "Users update own"
    ON public.user_profiles FOR UPDATE
    USING (auth.uid() = id);

    -- INSERT (Crucial for 'upsert' if row is missing/ghosted)
    CREATE POLICY "Users insert own"
    ON public.user_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

END $$;
