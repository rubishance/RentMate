-- 1. Add notification_preferences column to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"contract_expiry_days": 60, "rent_due_days": 3}';

-- 2. Update Contract Expiration Check to use preferences
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
                -- We allow re-notifying if the title implies a different "tier" of warning, but for now we keep it simple
                -- Just alert once per contract expiry cycle is usually enough, or enable duplicates if significant time passed
                 AND n.created_at > (CURRENT_DATE - INTERVAL '6 months') -- Simple debounce for same contract
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

-- 3. Update Rent Due Check to use preferences
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
        -- Extract preference, default to 3, cap at 180 (though less makes sense for rent)
        pref_days := COALESCE((due_payment.notification_preferences->>'rent_due_days')::int, 3);
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
