-- ============================================
-- FORCE ACTIVATE ACCOUNT (Bypass Email)
-- ============================================

-- 1. CONFIRM EMAIL MANUALLY (So you don't need to wait for it)
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email = 'rentmate.rubi@gmail.com';  -- Your Email

-- 2. FIX DATABASE SCHEMA (Add missing columns)
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free_forever';

-- 3. FORCE CREATE ADMIN PROFILE
DO $$
DECLARE
    v_user_id UUID;
    target_email TEXT := 'rentmate.rubi@gmail.com';
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE email = target_email;

    IF v_user_id IS NOT NULL THEN
        -- Insert or Update the profile to be an Admin
        INSERT INTO public.user_profiles (
            id, email, full_name, role, subscription_status, subscription_plan
        )
        VALUES (
            v_user_id, target_email, 'Admin User', 'admin', 'active', 'free_forever'
        )
        ON CONFLICT (id) DO UPDATE 
        SET role = 'admin', 
            subscription_status = 'active', 
            subscription_plan = 'free_forever';
            
        RAISE NOTICE 'User % has been fully activated and promoted to Admin.', target_email;
    ELSE
        RAISE WARNING 'User % not found in Auth system. Did you sign up?', target_email;
    END IF;
END;
$$;

-- 4. REPAIR SIGNUP TRIGGER (For future users)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.user_profiles (
        id, email, full_name, role, subscription_status, subscription_plan
    )
    VALUES (
        NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 
        'user', 'active', 'free_forever'
    )
    ON CONFLICT (id) DO NOTHING;

    -- Try to recover invoices (but don't fail if it breaks)
    BEGIN
        UPDATE public.invoices SET user_id = NEW.id 
        WHERE user_id IS NULL AND billing_email = NEW.email;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    RETURN NEW;
END;
$$;
