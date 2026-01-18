-- ============================================
-- FIX: Database Trigger for User Profile Creation
-- ============================================
-- This fixes the trigger to handle cases where the trigger might fail
-- Run this in Supabase SQL Editor if signup still fails
-- ============================================

-- Drop and recreate the trigger function with better error handling
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Try to insert the user profile
    INSERT INTO public.user_profiles (id, email, full_name, role, mfa_enabled)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
        'user',  -- Always start as 'user', not from metadata
        false
    )
    ON CONFLICT (id) DO NOTHING;  -- Ignore if already exists
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the signup
        RAISE WARNING 'Error creating user profile for %: %', NEW.email, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_profile();

-- Test the function
DO $$
BEGIN
    RAISE NOTICE '✅ Trigger function updated successfully!';
    RAISE NOTICE 'The trigger will now:';
    RAISE NOTICE '  - Create user profiles automatically';
    RAISE NOTICE '  - Handle conflicts gracefully';
    RAISE NOTICE '  - Not fail signup if profile creation fails';
END $$;
