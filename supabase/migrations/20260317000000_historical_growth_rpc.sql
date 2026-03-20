-- Create RPC for financial metrics history (Super Admin Only)
CREATE OR REPLACE FUNCTION get_historical_growth(p_months int DEFAULT 6)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_super boolean;
    result json;
BEGIN
    -- Check if requesting user is super admin
    SELECT is_super_admin INTO is_super
    FROM user_profiles 
    WHERE id = auth.uid();

    IF is_super IS NOT TRUE THEN
        RAISE EXCEPTION 'Access Denied: Super Admin Only';
    END IF;

    WITH months AS (
        SELECT date_trunc('month', NOW() - (i || ' months')::interval) AS month_start
        FROM generate_series(p_months - 1, 0, -1) i
    ),
    user_stats AS (
        SELECT 
            date_trunc('month', created_at) as month_start,
            count(*) as new_users
        FROM user_profiles
        GROUP BY 1
    ),
    revenue_stats AS (
        SELECT 
            date_trunc('month', created_at) as month_start,
            sum(paid_amount) as revenue
        FROM payments
        WHERE status = 'paid'
        GROUP BY 1
    )
    SELECT json_agg(
        json_build_object(
            'name', to_char(m.month_start, 'Mon'),
            'users', COALESCE((
                SELECT sum(new_users) 
                FROM user_stats u 
                WHERE u.month_start <= m.month_start
            ), 0),
            'mrr', COALESCE(r.revenue, 0)
        )
    ) INTO result
    FROM months m
    LEFT JOIN revenue_stats r ON m.month_start = r.month_start;

    RETURN COALESCE(result, '[]');
END;
$$;
