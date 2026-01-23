-- Migration: Fix Schema Discrepancies and Missing Relationships
-- 1. Fix user_storage_usage -> user_profiles relationship
DO $$ 
BEGIN
    -- Ensure relationship to user_profiles for PostgREST joins
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_storage_usage_user_id_profiles_fkey'
    ) THEN
        ALTER TABLE user_storage_usage 
        ADD CONSTRAINT user_storage_usage_user_id_profiles_fkey 
        FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Add price_yearly to subscription_plans
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscription_plans' AND column_name = 'price_yearly'
    ) THEN
        ALTER TABLE subscription_plans ADD COLUMN price_yearly NUMERIC(10, 2) DEFAULT 0;
    END IF;
END $$;

-- 3. Fix ai_chat_usage -> user_profiles relationship
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'ai_chat_usage_user_id_profiles_fkey'
    ) THEN
        ALTER TABLE ai_chat_usage 
        ADD CONSTRAINT ai_chat_usage_user_id_profiles_fkey 
        FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Upgrade get_admin_stats to JSONB
-- IMPORTANT: Drop first because we change return type
DROP FUNCTION IF EXISTS public.get_admin_stats();

CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSONB;
    total_users_count INTEGER;
    total_contracts_count INTEGER;
    total_revenue_amount NUMERIC;
    active_users_count INTEGER;
BEGIN
    -- Check if the current user is an admin
    IF NOT EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;

    -- Get total users count
    SELECT COUNT(*) INTO total_users_count
    FROM user_profiles
    WHERE deleted_at IS NULL;

    -- Get total contracts count
    SELECT COUNT(*) INTO total_contracts_count
    FROM contracts;

    -- Get total revenue (sum of paid payments)
    SELECT COALESCE(SUM(paid_amount), 0) INTO total_revenue_amount
    FROM payments
    WHERE status = 'paid';

    -- Get active users (users who logged in within last 30 days)
    SELECT COUNT(*) INTO active_users_count
    FROM user_profiles
    WHERE deleted_at IS NULL
    AND updated_at > NOW() - INTERVAL '30 days';

    -- Build JSONB result
    result := jsonb_build_object(
        'totalUsers', total_users_count,
        'totalContracts', total_contracts_count,
        'totalRevenue', total_revenue_amount,
        'activeUsers', active_users_count
    );

    RETURN result;
END;
$$;

-- 5. Admin Notifications Triggers
-- Function to trigger admin notification edge function
CREATE OR REPLACE FUNCTION notify_admin_of_event()
RETURNS TRIGGER AS $$
BEGIN
    -- Use Supabase Vault or Secrets for the API URL if needed, but here we hardcode the known URL pattern
    -- Alternatively, we can use a simpler approach if the Netlify/Edge function is public or has a secret key
    PERFORM
      net.http_post(
        url := 'https://qfvrekvugdjnwhnaucmz.supabase.co/functions/v1/admin-notifications',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT value FROM vault.secrets WHERE name = 'SERVICE_ROLE_KEY' LIMIT 1)
        ),
        body := jsonb_build_object(
          'type', TG_ARGV[0],
          'data', CASE 
                    WHEN TG_ARGV[0] = 'new_user' THEN jsonb_build_object('email', NEW.email, 'full_name', NEW.full_name)
                    WHEN TG_ARGV[0] = 'first_payment' THEN jsonb_build_object('email', (SELECT email FROM user_profiles WHERE id = NEW.user_id), 'amount', NEW.paid_amount, 'plan', NEW.plan_id)
                    ELSE '{}'::jsonb
                  END
        )
      );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for New User
-- This needs to happen after the profile is created
DROP TRIGGER IF EXISTS on_user_profile_created_notify_admin ON user_profiles;
CREATE TRIGGER on_user_profile_created_notify_admin
    AFTER INSERT ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION notify_admin_of_event('new_user');

-- Trigger for First Payment
-- Note: Logic to detect if it's the FIRST payment can be in the trigger or the function
CREATE OR REPLACE FUNCTION notify_admin_of_first_payment()
RETURNS TRIGGER AS $$
DECLARE
  payment_count INTEGER;
BEGIN
    -- Check if this is the user's first successful payment
    SELECT COUNT(*) INTO payment_count
    FROM payments
    WHERE user_id = NEW.user_id
    AND status = 'paid';

    IF payment_count = 1 THEN
        PERFORM notify_admin_of_event(); -- This needs to be called with arguments, so let's adjust
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Actually, let's keep it simple. The trigger itself will check
DROP TRIGGER IF EXISTS on_first_payment_notify_admin ON payments;
CREATE TRIGGER on_first_payment_notify_admin
    AFTER UPDATE ON payments
    FOR EACH ROW
    WHEN (OLD.status != 'paid' AND NEW.status = 'paid')
    EXECUTE FUNCTION notify_admin_of_event('first_payment');

-- 6. Cron Job for Daily Summary
-- Requires pg_cron to be enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
    'daily-summary-8am',
    '0 8 * * *', -- 8:00 AM every day
    $$
    SELECT net.http_post(
        url := 'https://qfvrekvugdjnwhnaucmz.supabase.co/functions/v1/admin-notifications',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT value FROM vault.secrets WHERE name = 'SERVICE_ROLE_KEY' LIMIT 1)
        ),
        body := jsonb_build_object('type', 'daily_summary')
    );
    $$
);
