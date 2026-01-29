-- Migration: Automate Contract Archiving for expired contracts
-- Date: 2026-01-29

-- 1. Create archiving function
CREATE OR REPLACE FUNCTION public.archive_expired_contracts()
RETURNS void AS $$
BEGIN
    -- Update contracts where the end_date has passed and they are still 'active'
    UPDATE public.contracts
    SET status = 'archived'
    WHERE status = 'active'
    AND end_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Integrate into daily notifications job (if it exists)
-- This ensures the logic runs whenever notifications are processed.
CREATE OR REPLACE FUNCTION public.process_daily_notifications_with_archive()
RETURNS void AS $$
BEGIN
    -- First, archive expired contracts
    PERFORM public.archive_expired_contracts();
    
    -- Then, run the existing notification logic
    PERFORM public.process_daily_notifications();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: If you have a cron job calling process_daily_notifications, 
-- you might want to point it to process_daily_notifications_with_archive instead.
-- For now, we wrap it in a way that's easy to call.
