-- Add Maintenance and Technical Control settings
INSERT INTO public.system_settings (key, value, description)
VALUES 
('maintenance_mode', false, 'When enabled, only Super Admins can access the application. Regular users see a maintenance screen.'),
('maintenance_message', 'RentMate is currently undergoing scheduled maintenance. We will be back shortly.', 'The message displayed to users during maintenance mode.'),
('disable_ai_processing', false, 'Emergency toggle to disable all AI-powered features (Contract Analysis, Chat, etc.) to save costs or during API outages.')
ON CONFLICT (key) DO UPDATE 
SET description = EXCLUDED.description;

-- Update get_financial_metrics to include storage distribution and system stats
CREATE OR REPLACE FUNCTION get_financial_metrics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_mrr decimal := 0;
    total_users int := 0;
    active_subs int := 0;
    new_users_30d int := 0;
    
    -- Storage stats
    total_storage_mb decimal := 0;
    media_storage_mb decimal := 0;
    docs_storage_mb decimal := 0;
    
    -- System flags
    is_maint_active boolean;
    is_ai_disabled boolean;
    
    is_super boolean;
BEGIN
    -- Security Check
    SELECT is_super_admin INTO is_super FROM user_profiles WHERE id = auth.uid();
    IF is_super IS NOT TRUE THEN RAISE EXCEPTION 'Access Denied: Super Admin Only'; END IF;

    -- 1. Standard Metrics
    SELECT COUNT(*) INTO total_users FROM user_profiles;
    SELECT COUNT(*) INTO active_subs FROM user_profiles WHERE plan_id IS NOT NULL AND plan_id NOT IN ('free', 'free_forever') AND subscription_status = 'active';
    
    SELECT COALESCE(SUM(sp.price_monthly), 0) INTO total_mrr 
    FROM user_profiles up 
    JOIN subscription_plans sp ON up.plan_id = sp.id 
    WHERE up.subscription_status = 'active';
    
    SELECT COUNT(*) INTO new_users_30d FROM user_profiles WHERE created_at > (NOW() - INTERVAL '30 days');

    -- 2. Storage Aggregation (Aggregating from user_storage_usage if it exists, or files)
    -- Assuming a table user_storage_usage exists based on types/database.ts line 79
    SELECT 
        COALESCE(SUM(total_bytes) / (1024 * 1024), 0),
        COALESCE(SUM(media_bytes) / (1024 * 1024), 0),
        COALESCE(SUM(documents_bytes + utilities_bytes + maintenance_bytes) / (1024 * 1024), 0)
    INTO total_storage_mb, media_storage_mb, docs_storage_mb
    FROM public.user_storage_usage;

    -- 3. System Flags
    SELECT (value::boolean) INTO is_maint_active FROM system_settings WHERE key = 'maintenance_mode';
    SELECT (value::boolean) INTO is_ai_disabled FROM system_settings WHERE key = 'disable_ai_processing';

    RETURN json_build_object(
        'mrr', total_mrr,
        'total_users', total_users,
        'active_subscribers', active_subs,
        'new_users_30d', new_users_30d,
        'storage', json_build_object(
            'total_mb', ROUND(total_storage_mb, 2),
            'media_mb', ROUND(media_storage_mb, 2),
            'docs_mb', ROUND(docs_storage_mb, 2)
        ),
        'system_status', json_build_object(
            'maintenance_mode', COALESCE(is_maint_active, false),
            'ai_disabled', COALESCE(is_ai_disabled, false)
        )
    );
END;
$$;
