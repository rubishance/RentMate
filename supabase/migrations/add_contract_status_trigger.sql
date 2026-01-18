-- Trigger: Notify on Contract Status Change

CREATE OR REPLACE FUNCTION public.notify_contract_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    property_address text;
    notification_title text;
    notification_body text;
BEGIN
    -- Only proceed if status changed
    IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
        RETURN NEW;
    END IF;

    -- Fetch property address
    SELECT city || ', ' || address INTO property_address
    FROM public.properties
    WHERE id = NEW.property_id;

    -- Determine message
    notification_title := 'Contract Status Updated';
    notification_body := format('Contract for %s is now %s.', property_address, NEW.status);

    -- Insert Notification
    INSERT INTO public.notifications (user_id, type, title, message, metadata)
    VALUES (
        NEW.user_id,
        'info', -- Status change is informational/important but not necessarily a warning
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

DROP TRIGGER IF EXISTS on_contract_status_change ON public.contracts;

CREATE TRIGGER on_contract_status_change
    AFTER UPDATE ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_contract_status_change();
