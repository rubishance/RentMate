-- Migration: Split Names into First and Last (with defaults)

DO $$ 
BEGIN

    -- 1. Add Columns (Allow NULL initially to populate)
    ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS first_name TEXT,
    ADD COLUMN IF NOT EXISTS last_name TEXT;

    -- 2. Migrate Data
    -- Strategy:
    -- First Name = full_name (if exists) OR 'User'
    -- Last Name = 'aaa' (Mandatory default for existing)
    UPDATE public.user_profiles
    SET 
        first_name = COALESCE(full_name, 'User'),
        last_name = 'aaa'
    WHERE first_name IS NULL OR last_name IS NULL;

    -- 3. Enforce Not Null
    ALTER TABLE public.user_profiles
    ALTER COLUMN first_name SET NOT NULL,
    ALTER COLUMN last_name SET NOT NULL;

END $$;
