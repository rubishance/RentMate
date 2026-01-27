-- Update Daily Notification Job to respect User Preferences
-- Specifically adding support for "Payment Due Today" toggle

CREATE OR REPLACE FUNCTION public.process_daily_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r RECORD;
    extension_days_default int := 60;
    pref jsonb;
BEGIN
    -------------------------------------------------------
    -- 1. CONTRACT ENDING SOON (Default 30 Days)
    -------------------------------------------------------
    FOR r IN
        SELECT c.id, c.user_id, c.end_date, p.city, p.address, up.notification_preferences
        FROM public.contracts c
        JOIN public.properties p ON p.id = c.property_id
        JOIN public.user_profiles up ON up.id = c.user_id
        WHERE c.status = 'active'
        AND c.end_date = CURRENT_DATE + (COALESCE((up.notification_preferences->>'contract_expiry_days')::int, 30) || ' days')::INTERVAL
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM public.notifications 
            WHERE user_id = r.user_id 
            AND metadata->>'contract_id' = r.id::text 
            AND metadata->>'event' = 'ending_soon'
            AND created_at > (CURRENT_DATE - INTERVAL '1 day')
        ) THEN
            INSERT INTO public.notifications (user_id, type, title, message, metadata)
            VALUES (
                r.user_id,
                'warning',
                'Contract Ending Soon',
                format('Contract for %s, %s ends in %s days.', r.city, r.address, COALESCE((r.notification_preferences->>'contract_expiry_days')::int, 30)),
                json_build_object('contract_id', r.id, 'event', 'ending_soon')::jsonb
            );
        END IF;
    END LOOP;

    -------------------------------------------------------
    -- 2. EXTENSION OPTION DEADLINE
    -------------------------------------------------------
    FOR r IN
        SELECT c.id, c.user_id, c.end_date, p.city, p.address, up.notification_preferences
        FROM public.contracts c
        JOIN public.properties p ON p.id = c.property_id
        JOIN public.user_profiles up ON up.id = c.user_id
        WHERE c.status = 'active'
        AND c.extension_option = TRUE
        AND c.end_date = CURRENT_DATE + (COALESCE((up.notification_preferences->>'extension_option_end_days')::int, 60) || ' days')::INTERVAL
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM public.notifications 
            WHERE user_id = r.user_id 
            AND metadata->>'contract_id' = r.id::text 
            AND metadata->>'event' = 'extension_deadline'
            AND created_at > (CURRENT_DATE - INTERVAL '1 day')
        ) THEN
            INSERT INTO public.notifications (user_id, type, title, message, metadata)
            VALUES (
                r.user_id,
                'action',
                'Extension Deadline Approaching',
                format('Extension option for %s, %s ends in %s days.', r.city, r.address, COALESCE((r.notification_preferences->>'extension_option_end_days')::int, 60)),
                json_build_object('contract_id', r.id, 'event', 'extension_deadline')::jsonb
            );
        END IF;
    END LOOP;

    -------------------------------------------------------
    -- 3. PAYMENT DUE IN X DAYS (Lead Warning)
    -------------------------------------------------------
    FOR r IN
        SELECT py.id, py.user_id, py.amount, py.date, p.city, p.address, up.notification_preferences
        FROM public.payments py
        JOIN public.contracts c ON c.id = py.contract_id
        JOIN public.properties p ON p.id = c.property_id
        JOIN public.user_profiles up ON up.id = py.user_id
        WHERE py.status = 'pending'
        AND py.date = CURRENT_DATE + (COALESCE((up.notification_preferences->>'rent_due_days')::int, 0) || ' days')::INTERVAL
        AND (up.notification_preferences->>'rent_due_days')::int > 0
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM public.notifications 
            WHERE user_id = r.user_id 
            AND metadata->>'payment_id' = r.id::text 
            AND metadata->>'event' = 'payment_warning'
            AND created_at > (CURRENT_DATE - INTERVAL '1 day')
        ) THEN
            INSERT INTO public.notifications (user_id, type, title, message, metadata)
            VALUES (
                r.user_id,
                'info',
                'Payment Reminder',
                format('Payment of ₪%s for %s, %s is due in %s days.', r.amount, r.city, r.address, (r.notification_preferences->>'rent_due_days')::int),
                json_build_object('payment_id', r.id, 'event', 'payment_warning')::jsonb
            );
        END IF;
    END LOOP;

    -------------------------------------------------------
    -- 4. PAYMENT DUE TODAY (Strict Toggle)
    -------------------------------------------------------
    FOR r IN
        SELECT py.id, py.user_id, py.amount, py.date, p.city, p.address, up.notification_preferences
        FROM public.payments py
        JOIN public.contracts c ON c.id = py.contract_id
        JOIN public.properties p ON p.id = c.property_id
        JOIN public.user_profiles up ON up.id = py.user_id
        WHERE py.status = 'pending'
        AND py.date = CURRENT_DATE
        AND COALESCE((up.notification_preferences->>'rent_due_today')::boolean, true) = true
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM public.notifications 
            WHERE user_id = r.user_id 
            AND metadata->>'payment_id' = r.id::text 
            AND metadata->>'event' = 'payment_due'
            AND created_at > (CURRENT_DATE - INTERVAL '1 day')
        ) THEN
            INSERT INTO public.notifications (user_id, type, title, message, metadata)
            VALUES (
                r.user_id,
                'warning',
                'Payment Due Today',
                format('Payment of ₪%s for %s, %s is due today.', r.amount, r.city, r.address),
                json_build_object('payment_id', r.id, 'event', 'payment_due')::jsonb
            );
        END IF;
    END LOOP;

END;
$$;
