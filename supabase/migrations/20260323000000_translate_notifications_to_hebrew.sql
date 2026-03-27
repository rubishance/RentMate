-- Update Daily Notification functions to generate notifications in Hebrew

-- 1. check_contract_expirations (from 20260120000032_enhanced_notifications)
CREATE OR REPLACE FUNCTION public.check_contract_expirations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expiring_contract RECORD;
    count_new integer := 0;
BEGIN
    FOR expiring_contract IN
        SELECT 
            c.id, 
            c.end_date, 
            c.property_id, 
            p.user_id, 
            p.address, 
            p.city
        FROM public.contracts c
        JOIN public.properties p ON c.property_id = p.id
        WHERE c.status = 'active'
        -- Changed to 60 days
        AND c.end_date <= (CURRENT_DATE + INTERVAL '60 days')
        AND c.end_date >= CURRENT_DATE
    LOOP
        IF NOT EXISTS (
            SELECT 1 
            FROM public.notifications n 
            WHERE n.user_id = expiring_contract.user_id
            AND n.type = 'warning'
            AND n.metadata->>'contract_id' = expiring_contract.id::text
            AND (n.title = 'Contract Expiring Soon' OR n.title = 'חוזה עומד להסתיים')
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
                'חוזה עומד להסתיים',
                'החוזה עבור ' || expiring_contract.address || ' מסתיים בעוד ' || (expiring_contract.end_date - CURRENT_DATE)::text || ' ימים (' || to_char(expiring_contract.end_date, 'DD/MM/YYYY') || '). מומלץ לבדוק אפשרות הארכה.',
                jsonb_build_object('contract_id', expiring_contract.id)
            );
            count_new := count_new + 1;
        END IF;
    END LOOP;
END;
$$;

-- 2. check_rent_due (from 20260120000032_enhanced_notifications.sql)
CREATE OR REPLACE FUNCTION public.check_rent_due()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    due_payment RECORD;
    count_new integer := 0;
BEGIN
    FOR due_payment IN
        SELECT 
            pay.id,
            pay.due_date,
            pay.amount,
            pay.currency,
            p.user_id,
            p.address
        FROM public.payments pay
        JOIN public.contracts c ON pay.contract_id = c.id
        JOIN public.properties p ON c.property_id = p.id
        WHERE pay.status = 'pending'
        AND pay.due_date <= (CURRENT_DATE + INTERVAL '3 days')
        AND pay.due_date >= CURRENT_DATE
    LOOP
        -- Avoid dupes for this specific payment ID
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
                'תשלום מגיע בקרוב',
                'שכר דירה על סך ' || due_payment.amount || ' ' || COALESCE(due_payment.currency, 'ILS') || ' עבור ' || due_payment.address || ' נדרש לתשלום בתאריך ' || to_char(due_payment.due_date, 'DD/MM/YYYY') || '.',
                jsonb_build_object('payment_id', due_payment.id)
            );
            count_new := count_new + 1;
        END IF;
    END LOOP;
END;
$$;

-- 3. check_extension_deadlines (from 20260120000033_extension_deadline_notifications.sql)
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
                AND (n.title = 'Extension Option Deadline Approaching' OR n.title = 'מועד סיום אופציית הארכה מתקרב')
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
                    'מועד סיום אופציית הארכה מתקרב',
                    'המועד האחרון להודעה על מימוש האופציה עבור ' || deadline_record.address || ' יחול בעוד ' || (deadline_record.extension_option_end - CURRENT_DATE)::text || ' ימים (' || to_char(deadline_record.extension_option_end, 'DD/MM/YYYY') || '). כדאי ליצור קשר עם השוכר.',
                    jsonb_build_object('contract_id', deadline_record.id)
                );
                count_new := count_new + 1;
            END IF;
        END IF;
    END LOOP;
END;
$$;

-- 4. check_extension_options (from 20260120000034_extension_notifications.sql)
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
                AND (n.title = 'Extension Option Available' OR n.title = 'אופציית הארכה זמינה')
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
                    'אופציית הארכה זמינה',
                    'תקופת מימוש האופציה עבור ' || extension_record.address || ' תחל בעוד ' || (extension_record.extension_option_start - CURRENT_DATE)::text || ' ימים (' || to_char(extension_record.extension_option_start, 'DD/MM/YYYY') || '). מומלץ לדבר עם השוכר.',
                    jsonb_build_object('contract_id', extension_record.id)
                );
                count_new := count_new + 1;
            END IF;
        END IF;
    END LOOP;
END;
$$;


-- 5. Translate existing English notifications to Hebrew
UPDATE public.notifications
SET 
  title = 'חוזה עומד להסתיים',
  message = REPLACE(REPLACE(REPLACE(
    message,
    'Contract for ', 'החוזה עבור '
  ), ' ends in ', ' מסתיים בעוד '), ' days', ' ימים')
WHERE title = 'Contract Expiring Soon' OR title = 'Contract Ending Soon';

UPDATE public.notifications
SET 
  title = 'תשלום מגיע בקרוב',
  message = REPLACE(REPLACE(REPLACE(
    message,
    'Rent of ', 'שכר דירה על סך '
  ), ' is due on ', ' נדרש לתשלום בתאריך '), ' for ', ' עבור ')
WHERE title = 'Rent Due Soon';

UPDATE public.notifications
SET 
  title = 'תזכורת תשלום',
  message = REPLACE(REPLACE(REPLACE(
    message,
    'Payment of ₪', 'תשלום על סך ₪'
  ), ' is due in ', ' צפוי בעוד '), ' days.', ' ימים.')
WHERE title = 'Payment Reminder';

UPDATE public.notifications
SET 
  title = 'תשלום מגיע היום',
  message = REPLACE(REPLACE(REPLACE(
    message,
    'Payment of ₪', 'תשלום על סך ₪'
  ), ' is due today.', ' מגיע היום.'), ' for ', ' עבור ')
WHERE title = 'Payment Due Today';

UPDATE public.notifications
SET 
  title = 'מועד סיום אופציית הארכה מתקרב',
  message = REPLACE(REPLACE(REPLACE(
    message,
    'Deadline to announce extension option for ', 'המועד האחרון להודעה על מימוש האופציה עבור '
  ), ' is in ', ' יחול בעוד '), 'Contact tenant soon.', 'כדאי ליצור קשר עם השוכר.')
WHERE title = 'Extension Option Deadline Approaching';

UPDATE public.notifications
SET 
  title = 'אופציית הארכה זמינה',
  message = REPLACE(REPLACE(REPLACE(
    message,
    'Extension option period for ', 'תקופת מימוש האופציה עבור '
  ), ' starts in ', ' תחל בעוד '), 'Consider discussing with tenant.', 'מומלץ לדבר עם השוכר.')
WHERE title = 'Extension Option Available';

UPDATE public.notifications
SET title = 'שכר דירה שלא שולם'
WHERE title = 'Unpaid Rent Notification';

UPDATE public.notifications
SET title = 'תשלום קרוב'
WHERE title = 'Upcoming Payment';
