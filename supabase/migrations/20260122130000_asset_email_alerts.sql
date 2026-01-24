-- Migration: asset_email_alerts
-- Description: Adds automated notifications and email forwarding for maintenance records based on user preference

-- 1. Create function to generate notification on maintenance record insertion
CREATE OR REPLACE FUNCTION public.notify_on_maintenance_record()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    property_address text;
    user_lang text;
    notif_title text;
    notif_message text;
BEGIN
    -- Only trigger for maintenance category
    IF NEW.category != 'maintenance' THEN
        RETURN NEW;
    END IF;

    -- Get property address
    SELECT COALESCE(city, '') || ', ' || COALESCE(address, '') INTO property_address
    FROM public.properties
    WHERE id = NEW.property_id;

    -- Get user language preference (defaults to 'he')
    SELECT COALESCE(language, 'he') INTO user_lang
    FROM public.user_profiles
    WHERE id = NEW.user_id;

    -- Set localized content
    IF user_lang = 'he' THEN
        notif_title := 'נוסף תיעוד תחזוקה';
        notif_message := format('נוסף תיעוד תחזוקה חדש ("%s") עבור הנכס %s.', COALESCE(NEW.title, 'ללא כותרת'), property_address);
    ELSE
        notif_title := 'Maintenance Record Added';
        notif_message := format('A new maintenance record ("%s") was added for %s.', COALESCE(NEW.title, 'Untitled'), property_address);
    END IF;

    -- Insert into notifications table
    INSERT INTO public.notifications (user_id, type, title, message, metadata)
    VALUES (
        NEW.user_id,
        'info',
        notif_title,
        notif_message,
        json_build_object(
            'document_id', NEW.id,
            'property_id', NEW.property_id,
            'event', 'maintenance_record'
        )::jsonb
    );

    RETURN NEW;
END;
$$;

-- Attach trigger to property_documents
DROP TRIGGER IF EXISTS on_maintenance_record_created ON public.property_documents;
CREATE TRIGGER on_maintenance_record_created
    AFTER INSERT ON public.property_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_on_maintenance_record();

-- 2. Update forward_notification_to_email to respect email_asset_alerts preference
CREATE OR REPLACE FUNCTION public.forward_notification_to_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    project_url text := 'https://qfvrekvugdjnwhnaucmz.supabase.co';
    target_email text;
    asset_alerts_enabled boolean;
BEGIN
    -- Get user email and asset alerts preference
    SELECT 
        u.email, 
        COALESCE((up.notification_preferences->>'email_asset_alerts')::boolean, true)
    INTO target_email, asset_alerts_enabled
    FROM auth.users u
    LEFT JOIN public.user_profiles up ON up.id = u.id
    WHERE u.id = NEW.user_id;

    -- DECISION LOGIC:
    -- Forward IF:
    -- 1. High priority type (warning, error, urgent, action)
    -- 2. OR is a maintenance event AND the user hasn't explicitly disabled asset alerts
    IF (NEW.type IN ('warning', 'error', 'urgent', 'action')) OR 
       (NEW.metadata->>'event' = 'maintenance_record' AND asset_alerts_enabled = true) 
    THEN
        IF target_email IS NOT NULL THEN
            PERFORM
              net.http_post(
                url := project_url || '/functions/v1/send-notification-email',
                headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}',
                body := json_build_object(
                    'email', target_email,
                    'notification', row_to_json(NEW)
                )::jsonb
              );
        END IF;
    END IF;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to forward notification to email: %', SQLERRM;
    RETURN NEW;
END;
$$;
