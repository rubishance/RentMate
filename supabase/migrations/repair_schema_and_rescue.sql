-- ============================================
-- FINAL REPAIR: SCHEMA + DATA + TRIGGERS
-- ============================================

-- 1. FIX TABLE SCHEMA (Add missing columns)
-- We use TEXT to avoid Enum complexities. It works perfectly with TS enums.
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free_forever';

-- Ensure role exists too
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- 2. RESCUE THE ADMIN USER (rentmate.rubi@gmail.com)
DO $$
DECLARE
    target_email TEXT := 'rentmate.rubi@gmail.com'; 
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE email = target_email;

    IF v_user_id IS NOT NULL THEN
        INSERT INTO public.user_profiles (
            id, email, full_name, role, subscription_status, subscription_plan
        )
        VALUES (
            v_user_id, 
            target_email, 
            'Admin User', 
            'admin', 
            'active', 
            'free_forever'
        )
        ON CONFLICT (id) DO UPDATE 
        SET role = 'admin', 
            subscription_status = 'active',
            subscription_plan = 'free_forever';
            
        RAISE NOTICE 'Admin profile repaired for %', target_email;
    ELSE
        RAISE NOTICE 'User % not found in Auth, skipping rescue.', target_email;
    END IF;
END;
$$;

-- 3. UPDATE SIGNUP TRIGGER (To match the fixed schema)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    -- Create Profile
    INSERT INTO public.user_profiles (
        id, email, full_name, role, subscription_status, subscription_plan
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'user',
        'active',
        'free_forever'
    )
    ON CONFLICT (id) DO NOTHING;

    -- Link Invoices (Safely)
    BEGIN
        UPDATE public.invoices SET user_id = NEW.id 
        WHERE user_id IS NULL AND billing_email = NEW.email;
    EXCEPTION WHEN OTHERS THEN 
        RAISE WARNING 'Link failed: %', SQLERRM; 
    END;

    RETURN NEW;
END;
$$;
