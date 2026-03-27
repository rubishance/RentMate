-- Migration to translate Contract Status notifications to Hebrew natively
-- Fixes the trigger function generating the English messages

CREATE OR REPLACE FUNCTION public.notify_contract_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    property_address text;
    notification_title text;
    notification_body text;
    status_hebrew text;
BEGIN
    -- Only proceed if status changed
    IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
        RETURN NEW;
    END IF;

    -- Fetch property address
    SELECT city || ', ' || address INTO property_address
    FROM public.properties
    WHERE id = NEW.property_id;

    -- Translate status
    CASE NEW.status
        WHEN 'active' THEN status_hebrew := 'פעיל';
        WHEN 'archived' THEN status_hebrew := 'בארכיון';
        WHEN 'pending' THEN status_hebrew := 'בהמתנה';
        WHEN 'ended' THEN status_hebrew := 'הסתיים';
        WHEN 'cancelled' THEN status_hebrew := 'בוטל';
        WHEN 'draft' THEN status_hebrew := 'טיוטה';
        ELSE status_hebrew := NEW.status;
    END CASE;

    -- Determine message
    notification_title := 'סטטוס חוזה עודכן';
    notification_body := format('החוזה עבור %s מעודכן כעת לסטטוס %s.', property_address, status_hebrew);

    -- Insert Notification
    INSERT INTO public.notifications (user_id, type, title, message, metadata)
    VALUES (
        NEW.user_id,
        'info',
        notification_title,
        notification_body,
        json_build_object(
            'contract_id', NEW.id,
            'event', 'status_change',
            'old_status', OLD.status,
            'new_status', NEW.status
        )::jsonb
    );

    RETURN NEW;
END;
$$;

-- Translate past notifications
UPDATE public.notifications
SET title = 'סטטוס חוזה עודכן',
    message = replace(
                replace(
                  replace(
                    replace(message, 'is now active.', 'מעודכן כעת לסטטוס פעיל.'),
                  'is now archived.', 'מעודכן כעת לסטטוס בארכיון.'),
                'is now ended.', 'מעודכן כעת לסטטוס הסתיים.'),
              'Contract for ', 'החוזה עבור ')
WHERE title = 'Contract Status Updated';
