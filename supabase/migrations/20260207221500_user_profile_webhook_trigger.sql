-- Create Trigger for User Profile Updates
-- This attaches the user_profiles table to the existing automated engagement webhook system

DROP TRIGGER IF EXISTS tr_on_user_profile_update ON public.user_profiles;

CREATE TRIGGER tr_on_user_profile_update
AFTER UPDATE ON public.user_profiles
FOR EACH ROW
WHEN (
    OLD.plan_id IS DISTINCT FROM NEW.plan_id OR
    OLD.email IS DISTINCT FROM NEW.email OR
    OLD.phone IS DISTINCT FROM NEW.phone
)
EXECUTE FUNCTION public.handle_automated_engagement_webhook();
