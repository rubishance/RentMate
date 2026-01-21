-- ============================================
-- FIX SIGNUP TRIGGER (Proper Plan Linking)
-- ============================================

-- 1. Ensure the 'free' plan exists to avoid foreign key errors
INSERT INTO public.subscription_plans (id, name, price_monthly, max_properties, max_tenants)
VALUES ('free', 'Free Forever', 0, 1, 2)
ON CONFLICT (id) DO NOTHING;

-- 2. Re-define the handler to set plan_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.user_profiles (
        id, 
        email, 
        full_name, 
        role, 
        subscription_status, 
        plan_id, -- New relation
        subscription_plan -- Legacy enum fallback
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'user'::user_role,
        'active'::subscription_status,
        'free', -- Default to 'free' plan ID
        'free_forever'::subscription_plan_type -- Legacy fallback
    );
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Profile creation failed: %', SQLERRM;
END;
$$;
