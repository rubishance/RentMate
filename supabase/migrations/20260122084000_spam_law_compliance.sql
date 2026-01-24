-- Add marketing consent fields to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS marketing_consent_at TIMESTAMPTZ;

-- Update the handle_new_user function to capture marketing_consent
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
        first_name,
        last_name,
        role, 
        subscription_status, 
        plan_id,
        marketing_consent,
        marketing_consent_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        'User',
        'active',
        'free',
        COALESCE((NEW.raw_user_meta_data->>'marketing_consent')::boolean, FALSE),
        CASE WHEN (NEW.raw_user_meta_data->>'marketing_consent')::boolean THEN NOW() ELSE NULL END
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
        first_name = COALESCE(EXCLUDED.first_name, user_profiles.first_name),
        last_name = COALESCE(EXCLUDED.last_name, user_profiles.last_name),
        marketing_consent = COALESCE(EXCLUDED.marketing_consent, user_profiles.marketing_consent),
        marketing_consent_at = COALESCE(EXCLUDED.marketing_consent_at, user_profiles.marketing_consent_at),
        updated_at = NOW();

    RETURN NEW;
END;
$$;
