-- Add extension_option_days to notification preferences
-- Update default structure to include all three notification types

-- 1. Update existing records to include extension_option_days
UPDATE public.user_profiles
SET notification_preferences = jsonb_set(
    COALESCE(notification_preferences, '{}'::jsonb),
    '{extension_option_days}',
    '30'
)
WHERE notification_preferences IS NULL 
   OR NOT notification_preferences ? 'extension_option_days';

-- 2. Create function to check for upcoming extension option periods
CREATE OR REPLACE FUNCTION public.check_extension_options()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    extension_record RECORD;
    count_new integer := 0;
    pref_days integer;
BEGIN
    FOR extension_record IN
        SELECT 
            c.id, 
            c.extension_option_start,
            c.property_id, 
            p.user_id, 
            p.address,
            up.notification_preferences
        FROM public.contracts c
        JOIN public.properties p ON c.property_id = p.id
        JOIN public.user_profiles up ON p.user_id = up.id
        WHERE c.status = 'active'
        AND c.extension_option_start IS NOT NULL
    LOOP
        -- Extract preference, default to 30, cap at 180
        pref_days := COALESCE((extension_record.notification_preferences->>'extension_option_days')::int, 30);
        IF pref_days > 180 THEN pref_days := 180; END IF;
        IF pref_days < 1 THEN pref_days := 1; END IF;

        -- Check if extension option starts in this window
        IF extension_record.extension_option_start <= (CURRENT_DATE + (pref_days || ' days')::interval)
           AND extension_record.extension_option_start >= CURRENT_DATE THEN
           
            IF NOT EXISTS (
                SELECT 1 
                FROM public.notifications n 
                WHERE n.user_id = extension_record.user_id
                AND n.type = 'info'
                AND n.metadata->>'contract_id' = extension_record.id::text
                AND n.title = 'Extension Option Available'
                AND n.created_at > (CURRENT_DATE - INTERVAL '6 months')
            ) THEN
                INSERT INTO public.notifications (
                    user_id,
                    type,
                    title,
                    message,
                    metadata
                ) VALUES (
                    extension_record.user_id,
                    'info',
                    'Extension Option Available',
                    'Extension option period for ' || extension_record.address || ' starts in ' || (extension_record.extension_option_start - CURRENT_DATE)::text || ' days (' || to_char(extension_record.extension_option_start, 'DD/MM/YYYY') || '). Consider discussing with tenant.',
                    jsonb_build_object('contract_id', extension_record.id)
                );
                count_new := count_new + 1;
            END IF;
        END IF;
    END LOOP;
END;
$$;

-- 3. Update the master daily notifications function to include extension checks
CREATE OR REPLACE FUNCTION public.check_daily_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM public.check_contract_expirations();
    PERFORM public.check_rent_due();
    PERFORM public.check_extension_options();
END;
$$;
