-- =================================================================
-- EMERGENCY RESET FOR AUTH & RLS (Run this to fix 500 Errors)
-- =================================================================

-- 1. DISABLE RLS TEMPORARILY (To unblock operations while we fix)
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- 2. DROP ALL EXISTING POLICIES (Clean Slate)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins see all" ON public.user_profiles;
DROP POLICY IF EXISTS "Users view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.user_profiles;

-- 3. DROP TRIGGERS & FUNCTIONS (To ensure no loop in triggers)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_created_relink_invoices ON auth.users;
DROP FUNCTION IF EXISTS public.relink_past_invoices();

-- 4. FIX TYPES (Ensure Enums exist)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'admin', 'manager');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 5. RE-CREATE SAFE ADMIN CHECK (SECURITY DEFINER is Key)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER -- Bypasses RLS
SET search_path = public
AS $$
BEGIN
    -- Check if the user has 'admin' role in user_profiles
    RETURN EXISTS (
        SELECT 1 
        FROM public.user_profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    );
END;
$$;

-- 6. RE-CREATE HANDLE NEW USER (Simple & Safe)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER -- Bypasses RLS
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        'user' -- Default role
    )
    ON CONFLICT (id) DO NOTHING; -- Prevent errors if retry
    RETURN NEW;
END;
$$;

-- 7. RE-ATTACH TRIGGER
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 8. RE-ENABLE RLS WITH SIMPLE POLICIES
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users see themselves
CREATE POLICY "Users view own" 
    ON public.user_profiles FOR SELECT 
    USING (auth.uid() = id);

-- Policy: Users update themselves
CREATE POLICY "Users update own" 
    ON public.user_profiles FOR UPDATE 
    USING (auth.uid() = id);

-- Policy: Admins see all (Using Safe Function)
CREATE POLICY "Admins view all" 
    ON public.user_profiles FOR SELECT 
    USING (public.is_admin());

-- Policy: Admins update all
CREATE POLICY "Admins update all" 
    ON public.user_profiles FOR UPDATE 
    USING (public.is_admin());
