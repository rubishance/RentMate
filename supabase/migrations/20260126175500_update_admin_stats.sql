-- ============================================
-- UPDATED ADMIN STATS FUNCTION (v2)
-- ============================================
-- Adds Automation & Engagement metrics

CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
    total_users_count INTEGER;
    total_contracts_count INTEGER;
    total_revenue_amount NUMERIC;
    active_users_count INTEGER;
    total_ai_cost NUMERIC;
    automated_actions_count INTEGER;
    stagnant_tickets_count INTEGER;
    avg_sentiment_score NUMERIC;
    last_automation_run TIMESTAMPTZ;
BEGIN
    -- Check if the current user is an admin
    IF NOT EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;

    -- 1. Core Metrics
    SELECT COUNT(*) INTO total_users_count FROM user_profiles WHERE deleted_at IS NULL;
    SELECT COUNT(*) INTO total_contracts_count FROM contracts;
    SELECT COALESCE(SUM(paid_amount), 0) INTO total_revenue_amount FROM payments WHERE status = 'paid';
    SELECT COUNT(*) INTO active_users_count FROM user_profiles WHERE deleted_at IS NULL AND updated_at > NOW() - INTERVAL '30 days';
    
    -- 2. AI & Automation Metrics
    SELECT COALESCE(SUM(total_cost_usd), 0) INTO total_ai_cost FROM ai_conversations;
    SELECT COUNT(*) INTO automated_actions_count FROM automation_logs;
    SELECT COUNT(*) INTO stagnant_tickets_count FROM support_tickets WHERE status = 'open' AND updated_at < NOW() - INTERVAL '24 hours';
    SELECT COALESCE(AVG(sentiment_score), 0) INTO avg_sentiment_score FROM ticket_analysis;
    SELECT MAX(created_at) INTO last_automation_run FROM automation_logs;

    -- 3. Build Result
    result := json_build_object(
        'totalUsers', total_users_count,
        'totalContracts', total_contracts_count,
        'totalRevenue', total_revenue_amount,
        'activeUsers', active_users_count,
        'totalAiCost', total_ai_cost,
        'totalAutomatedActions', automated_actions_count,
        'stagnantTickets', stagnant_tickets_count,
        'avgSentiment', avg_sentiment_score,
        'lastAutomationRun', last_automation_run
    );

    RETURN result;
END;
$$;
