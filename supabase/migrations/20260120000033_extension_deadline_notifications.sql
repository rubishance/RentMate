-- Add extension_option_end column and notification preference

-- 1. Add extension_option_end column to contracts table
ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS extension_option_end DATE;

COMMENT ON COLUMN public.contracts.extension_option_end IS 'Deadline for tenant to announce/apply for extension option';

-- 2. Add extension_option_end_days to notification preferences
UPDATE public.user_profiles
SET notification_preferences = jsonb_set(
    COALESCE(notification_preferences, '{}'::jsonb),
    '{extension_option_end_days}',
    '7'
)
WHERE notification_preferences IS NULL 
   OR NOT notification_preferences ? 'extension_option_end_days';

-- 3. Create function to check for upcoming extension option deadlines
CREATE OR REPLACE FUNCTION public.check_extension_deadlines()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deadline_record RECORD;
    count_new integer := 0;
    pref_days integer;
BEGIN
    FOR deadline_record IN
        SELECT 
            c.id, 
            c.extension_option_end,
            c.property_id, 
            p.user_id, 
            p.address,
            up.notification_preferences
        FROM public.contracts c
        JOIN public.properties p ON c.property_id = p.id
        JOIN public.user_profiles up ON p.user_id = up.id
        WHERE c.status = 'active'
        AND c.extension_option_end IS NOT NULL
    LOOP
        -- Extract preference, default to 7, cap at 180
        pref_days := COALESCE((deadline_record.notification_preferences->>'extension_option_end_days')::int, 7);
        
        -- Skip if disabled (0)
        IF pref_days = 0 THEN
            CONTINUE;
        END IF;
        
        IF pref_days > 180 THEN pref_days := 180; END IF;
        IF pref_days < 1 THEN pref_days := 1; END IF;

        -- Check if deadline is approaching
        IF deadline_record.extension_option_end <= (CURRENT_DATE + (pref_days || ' days')::interval)
           AND deadline_record.extension_option_end >= CURRENT_DATE THEN
           
            IF NOT EXISTS (
                SELECT 1 
                FROM public.notifications n 
                WHERE n.user_id = deadline_record.user_id
                AND n.type = 'warning'
                AND n.metadata->>'contract_id' = deadline_record.id::text
                AND n.title = 'Extension Option Deadline Approaching'
                AND n.created_at > (CURRENT_DATE - INTERVAL '6 months')
            ) THEN
                INSERT INTO public.notifications (
                    user_id,
                    type,
                    title,
                    message,
                    metadata
                ) VALUES (
                    deadline_record.user_id,
                    'warning',
                    'Extension Option Deadline Approaching',
                    'Deadline to announce extension option for ' || deadline_record.address || ' is in ' || (deadline_record.extension_option_end - CURRENT_DATE)::text || ' days (' || to_char(deadline_record.extension_option_end, 'DD/MM/YYYY') || '). Contact tenant soon.',
                    jsonb_build_object('contract_id', deadline_record.id)
                );
                count_new := count_new + 1;
            END IF;
        END IF;
    END LOOP;
END;
$$;

-- 4. Update master daily notifications function
CREATE OR REPLACE FUNCTION public.check_daily_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM public.check_contract_expirations();
    PERFORM public.check_rent_due();
    PERFORM public.check_extension_options();
    PERFORM public.check_extension_deadlines();
END;
$$;
