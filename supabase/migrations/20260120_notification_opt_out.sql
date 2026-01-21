-- Update notification functions to respect 0 value (disabled notifications)

-- 1. Update Contract Expiration Check to skip if disabled (0 days)
CREATE OR REPLACE FUNCTION public.check_contract_expirations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expiring_contract RECORD;
    count_new integer := 0;
    pref_days integer;
BEGIN
    FOR expiring_contract IN
        SELECT 
            c.id, 
            c.end_date, 
            c.property_id, 
            p.user_id, 
            p.address, 
            p.city,
            up.notification_preferences
        FROM public.contracts c
        JOIN public.properties p ON c.property_id = p.id
        JOIN public.user_profiles up ON p.user_id = up.id
        WHERE c.status = 'active'
    LOOP
        -- Extract preference, default to 60, cap at 180
        pref_days := COALESCE((expiring_contract.notification_preferences->>'contract_expiry_days')::int, 60);
        
        -- Skip if disabled (0)
        IF pref_days = 0 THEN
            CONTINUE;
        END IF;
        
        IF pref_days > 180 THEN pref_days := 180; END IF;
        IF pref_days < 1 THEN pref_days := 1; END IF;

        -- Check if contract expires in this window
        IF expiring_contract.end_date <= (CURRENT_DATE + (pref_days || ' days')::interval)
           AND expiring_contract.end_date >= CURRENT_DATE THEN
           
            IF NOT EXISTS (
                SELECT 1 
                FROM public.notifications n 
                WHERE n.user_id = expiring_contract.user_id
                AND n.type = 'warning'
                AND n.metadata->>'contract_id' = expiring_contract.id::text
                AND n.created_at > (CURRENT_DATE - INTERVAL '6 months')
            ) THEN
                INSERT INTO public.notifications (
                    user_id,
                    type,
                    title,
                    message,
                    metadata
                ) VALUES (
                    expiring_contract.user_id,
                    'warning',
                    'Contract Expiring Soon',
                    'Contract for ' || expiring_contract.address || ' ends in ' || (expiring_contract.end_date - CURRENT_DATE)::text || ' days (' || to_char(expiring_contract.end_date, 'DD/MM/YYYY') || '). Review and renew today.',
                    jsonb_build_object('contract_id', expiring_contract.id)
                );
                count_new := count_new + 1;
            END IF;
        END IF;
    END LOOP;
END;
$$;

-- 2. Update Rent Due Check to skip if disabled (0 days)
CREATE OR REPLACE FUNCTION public.check_rent_due()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    due_payment RECORD;
    count_new integer := 0;
    pref_days integer;
BEGIN
    FOR due_payment IN
        SELECT 
            pay.id,
            pay.due_date,
            pay.amount,
            pay.currency,
            p.user_id,
            p.address,
            up.notification_preferences
        FROM public.payments pay
        JOIN public.contracts c ON pay.contract_id = c.id
        JOIN public.properties p ON c.property_id = p.id
        JOIN public.user_profiles up ON p.user_id = up.id
        WHERE pay.status = 'pending'
    LOOP
        -- Extract preference, default to 3, cap at 180
        pref_days := COALESCE((due_payment.notification_preferences->>'rent_due_days')::int, 3);
        
        -- Skip if disabled (0)
        IF pref_days = 0 THEN
            CONTINUE;
        END IF;
        
        IF pref_days > 180 THEN pref_days := 180; END IF;

        IF due_payment.due_date <= (CURRENT_DATE + (pref_days || ' days')::interval)
           AND due_payment.due_date >= CURRENT_DATE THEN

            IF NOT EXISTS (
                SELECT 1 
                FROM public.notifications n 
                WHERE n.user_id = due_payment.user_id
                AND n.type = 'info'
                AND n.metadata->>'payment_id' = due_payment.id::text
            ) THEN
                INSERT INTO public.notifications (
                    user_id,
                    type,
                    title,
                    message,
                    metadata
                ) VALUES (
                    due_payment.user_id,
                    'info',
                    'Rent Due Soon',
                    'Rent of ' || due_payment.amount || ' ' || due_payment.currency || ' for ' || due_payment.address || ' is due on ' || to_char(due_payment.due_date, 'DD/MM/YYYY') || '.',
                    jsonb_build_object('payment_id', due_payment.id)
                );
                count_new := count_new + 1;
            END IF;
        END IF;
    END LOOP;
END;
$$;

-- 3. Update Extension Option Check to skip if disabled (0 days)
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
        
        -- Skip if disabled (0)
        IF pref_days = 0 THEN
            CONTINUE;
        END IF;
        
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
