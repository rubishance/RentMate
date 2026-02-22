-- RENTMATE MINIMAL SEED V12.0
-- REQUIRED DATA ONLY

-- 3. Seed Default Data
INSERT INTO public.system_settings (key, value, description)
VALUES 
    ('trial_duration_days', '14'::jsonb, 'Duration of the free trial in days'),
    ('maintenance_mode', 'false'::jsonb, 'If true, shows maintenance screen to non-admins'),
    ('enable_signups', 'true'::jsonb, 'Master switch to allow new user registrations')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.notification_rules (id, name, description, is_enabled, days_offset, channels, target_audience, message_template)
VALUES
    ('ending_soon', 'Contract Ending Soon', 'Warns before contract end date', true, 30, '["in_app", "push"]'::jsonb, 'user', 'Contract for %s, %s ends in %s days.'),
    ('extension_deadline', 'Extension Deadline', 'Warns before extension option expires', true, 60, '["in_app", "push"]'::jsonb, 'user', 'Extension option for %s, %s ends in %s days.'),
    ('index_update', 'Annual Index Update', 'Reminder to update rent based on index', true, 0, '["in_app", "push"]'::jsonb, 'user', 'Annual index update required for %s, %s.'),
    ('payment_due', 'Payment Due Today', 'Alerts when a pending payment date is reached', true, 0, '["in_app", "push"]'::jsonb, 'user', 'Payment of ג‚×%s for %s, %s is due today.')
ON CONFLICT (id) DO NOTHING;

    -- 2. Create the Profile manually if it's missing
    INSERT INTO public.user_profiles (
        id, 
        email, 
        full_name, 
        role, 
        subscription_status, 
        subscription_plan
    )
    VALUES (
        v_user_id,
        target_email,
        'Admin User', -- Default name
        'admin',      -- Give yourself Admin access
        'active',
        'free_forever'
    )
    ON CONFLICT (id) DO UPDATE 
    SET role = 'admin', subscription_status = 'active';

-- 1. Create missing profiles for orphaned auth users
INSERT INTO public.user_profiles (
    id, 
    email, 
    full_name,
    first_name,
    last_name,
    role, 
    subscription_status, 
    plan_id
)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
    COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
    'User',
    'user',
    'active',
    'free'
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE up.id IS NULL
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
    first_name = COALESCE(EXCLUDED.first_name, user_profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, user_profiles.last_name),
    updated_at = NOW();

-- 1. Ensure the 'free' plan exists to avoid foreign key errors
INSERT INTO public.subscription_plans (id, name, price_monthly, max_properties, max_tenants)
VALUES ('free', 'Free Forever', 0, 1, 2)
ON CONFLICT (id) DO NOTHING;

    IF v_user_id IS NOT NULL THEN
        -- Insert or Update the profile to be an Admin
        INSERT INTO public.user_profiles (
            id, email, full_name, role, subscription_status, subscription_plan
        )
        VALUES (
            v_user_id, target_email, 'Admin User', 'admin', 'active', 'free_forever'
        )
        ON CONFLICT (id) DO UPDATE 
        SET role = 'admin', 
            subscription_status = 'active', 
            subscription_plan = 'free_forever';

    IF v_user_id IS NOT NULL THEN
        INSERT INTO public.user_profiles (
            id, email, full_name, role, subscription_status, subscription_plan
        )
        VALUES (
            v_user_id, 
            target_email, 
            'Admin User', 
            'admin', 
            'active', 
            'free_forever'
        )
        ON CONFLICT (id) DO UPDATE 
        SET role = 'admin', 
            subscription_status = 'active',
            subscription_plan = 'free_forever';

INSERT INTO index_bases (index_type, base_period_start, base_value, chain_factor, previous_base_period_start)
VALUES
-- Base Average 2022 = 100.0 (Started Jan 2023)
('cpi', '2023-01-01', 100.0, 1.081, '2021-01-01'),

-- 1. Create Bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('secure_documents', 'secure_documents', false, false, 5242880, ARRAY['application/pdf', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO NOTHING;

-- Seed Data
INSERT INTO subscription_plans (id, name, price_monthly, max_properties, max_tenants, max_contracts, max_sessions, features)
VALUES 
    ('free', 'Free Forever', 0, 1, 2, 1, 1, '{"support_level": "basic"}'::jsonb),
    ('pro', 'Pro', 29.99, 10, 20, -1, 3, '{"support_level": "priority", "export_data": true}'::jsonb),
    ('enterprise', 'Enterprise', 99.99, -1, -1, -1, -1, '{"support_level": "dedicated", "export_data": true, "api_access": true}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    price_monthly = EXCLUDED.price_monthly,
    max_properties = EXCLUDED.max_properties,
    max_tenants = EXCLUDED.max_tenants,
    max_contracts = EXCLUDED.max_contracts,
    max_sessions = EXCLUDED.max_sessions,
    features = EXCLUDED.features;
-- ============================================
-- 2. Link User Profiles to Subscription Plans
-- ============================================

    -- 3. Log the action
    INSERT INTO public.audit_logs (user_id, action, details)
    VALUES (
        auth.uid(), 
        'delete_user', 
        jsonb_build_object('target_user_id', target_user_id, 'target_email', target_email)
    );

        INSERT INTO public.audit_logs (user_id, action, details)
        VALUES (
            auth.uid(), -- The admin performing the update
            'update_user_profile',
            jsonb_build_object(
                'target_user_id', NEW.id,
                'changes', jsonb_build_object(
                    'role', CASE WHEN OLD.role IS DISTINCT FROM NEW.role THEN jsonb_build_array(OLD.role, NEW.role) ELSE NULL END,
                    'plan_id', CASE WHEN OLD.plan_id IS DISTINCT FROM NEW.plan_id THEN jsonb_build_array(OLD.plan_id, NEW.plan_id) ELSE NULL END,
                    'status', CASE WHEN OLD.subscription_status IS DISTINCT FROM NEW.subscription_status THEN jsonb_build_array(OLD.subscription_status, NEW.subscription_status) ELSE NULL END
                )
            )
        );
    END IF;
    RETURN NEW;
END;
$$;

-- Storage Bucket for Screenshots
INSERT INTO storage.buckets (id, name, public) 
VALUES ('feedback-screenshots', 'feedback-screenshots', true)
ON CONFLICT (id) DO NOTHING;

        -- Try to insert
        BEGIN
            INSERT INTO calculation_shares (id, user_id, calculation_data)
            VALUES (v_short_id, auth.uid(), p_calculation_data);

    IF TG_OP = 'INSERT' THEN
        EXECUTE format('
            INSERT INTO user_storage_usage (user_id, total_bytes, file_count, %I)
            VALUES ($1, $2, 1, $2)
            ON CONFLICT (user_id) DO UPDATE SET
                total_bytes = user_storage_usage.total_bytes + $2,
                file_count = user_storage_usage.file_count + 1,
                %I = user_storage_usage.%I + $2,
                updated_at = NOW()
        ', v_col, v_col, v_col) USING v_user_id, v_size;

    IF TG_OP = 'INSERT' THEN
        EXECUTE format('
            INSERT INTO user_storage_usage (user_id, total_bytes, file_count, %I)
            VALUES ($1, $2, 1, $2)
            ON CONFLICT (user_id) DO UPDATE SET
                total_bytes = user_storage_usage.total_bytes + $2,
                file_count = user_storage_usage.file_count + 1,
                %I = user_storage_usage.%I + $2,
                updated_at = NOW()
        ', v_col, v_col, v_col) USING v_user_id, v_size;

-- Insert default limits
INSERT INTO ai_usage_limits (tier_name, monthly_message_limit, monthly_token_limit) VALUES
    ('free', 50, 50000),           -- 50 messages, ~50k tokens
    ('basic', 200, 200000),         -- 200 messages, ~200k tokens
    ('pro', 1000, 1000000),         -- 1000 messages, ~1M tokens
    ('business', -1, -1)            -- Unlimited (-1)
ON CONFLICT (tier_name) DO NOTHING;

    -- Get or create usage record
    INSERT INTO ai_chat_usage (user_id, message_count, tokens_used)
    VALUES (p_user_id, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;

    -- 3. Check if allowed
    IF v_limit = -1 OR (v_current_usage + p_count) <= v_limit THEN
        -- Log the usage (multiple entries)
        FOR i IN 1..p_count LOOP
            INSERT INTO ai_usage_logs (user_id, feature_name)
            VALUES (p_user_id, p_feature);
        END LOOP;

-- Verify trigger is active
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created'
    ) THEN
        RAISE NOTICE 'Signup trigger successfully installed';
    ELSE
        RAISE WARNING 'Signup trigger installation failed!';
    END IF;
END $$;
INSERT INTO public.system_settings (key, value, description)
VALUES 
('maintenance_mode', 'false'::jsonb, 'When enabled, only Super Admins can access the application. Regular users see a maintenance screen.'),
('maintenance_message', '"RentMate is currently undergoing scheduled maintenance. We will be back shortly."'::jsonb, 'The message displayed to users during maintenance mode.'),
('disable_ai_processing', 'false'::jsonb, 'Emergency toggle to disable all AI-powered features (Contract Analysis, Chat, etc.) to save costs or during API outages.')
ON CONFLICT (key) DO UPDATE 
SET description = EXCLUDED.description;

    -- Get or create usage record
    INSERT INTO ai_chat_usage (user_id, message_count, tokens_used)
    VALUES (p_user_id, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;

    -- Insert log
    INSERT INTO public.ai_usage_logs (
        user_id,
        model,
        feature,
        input_tokens,
        output_tokens,
        estimated_cost_usd
    ) VALUES (
        p_user_id,
        p_model,
        p_feature,
        p_input_tokens,
        p_output_tokens,
        v_total_cost
    );

    -- Update the old aggregator table if it exists
    INSERT INTO public.ai_chat_usage (user_id, message_count, tokens_used, updated_at)
    VALUES (p_user_id, 1, p_input_tokens + p_output_tokens, NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET message_count = public.ai_chat_usage.message_count + 1,
        tokens_used = public.ai_chat_usage.tokens_used + (p_input_tokens + p_output_tokens),
        updated_at = NOW();
END;
$$;

    -- Update existing or insert new
    INSERT INTO public.ai_conversations (id, user_id, messages, total_cost_usd, updated_at)
    VALUES (
        p_conversation_id,
        v_final_user_id,
        p_new_messages,
        p_cost_usd,
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET messages = public.ai_conversations.messages || EXCLUDED.messages,
        total_cost_usd = public.ai_conversations.total_cost_usd + EXCLUDED.total_cost_usd,
        updated_at = NOW()
    RETURNING id INTO v_conv_id;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'ai_data_consent') THEN
        ALTER TABLE user_preferences 
        ADD COLUMN IF NOT EXISTS ai_data_consent BOOLEAN DEFAULT false;
    END IF;
END $$;
-- Add 'live_chat_enabled' to system_settings
INSERT INTO public.system_settings (key, value, description)
VALUES 
  ('live_chat_enabled', 'true'::jsonb, 'Toggle the visibility of the Live Support button for all tenants.')
ON CONFLICT (key) DO NOTHING;
-- Add 'hybrid_chat_mode' to system_settings
INSERT INTO public.system_settings (key, value, description)
VALUES 
  ('hybrid_chat_mode', 'true'::jsonb, 'Enable rule-based menu before AI chat to reduce costs.')
ON CONFLICT (key) DO NOTHING;
-- Migration: Add Autonomous Notice Periods to Contracts
-- Description: Adds columns to store legal notice periods extracted from the contract by AI.

INSERT INTO public.system_settings (key, value, description)
VALUES 
  ('crm_autopilot_enabled', 'true'::jsonb, 'Global toggle to enable or disable the automated CRM autopilot (rent reminders, lease expiry, ticket drafts).')
ON CONFLICT (key) DO UPDATE 
SET description = EXCLUDED.description;
-- Add granular autopilot and voice capture settings
INSERT INTO system_settings (key, value, description)
VALUES 
  ('auto_renew_reminders_enabled', 'true'::jsonb, 'Enable automatic reminders for lease renewals and expirations.'),
  ('auto_rent_overdue_alerts_enabled', 'true'::jsonb, 'Enable automatic alerts for overdue rent payments.'),
  ('auto_cpi_adjustment_proposals_enabled', 'true'::jsonb, 'Enable automatic CPI rent adjustment proposals in the Action Inbox.'),
  ('auto_growth_engine_enabled', 'true'::jsonb, 'Enable AI-driven upsell nudges and onboarding help alerts.'),
  ('auto_stagnant_ticket_drafting_enabled', 'true'::jsonb, 'Enable automatic drafting of follow-up messages for stagnant support tickets.'),
  ('voice_capture_enabled', 'false'::jsonb, 'Enable automated phone call capture and AI summarization (Twilio/Vapi).'),
  ('voice_api_key', '""'::jsonb, 'API Key for the voice capture service provider (Twilio/Vapi).')
ON CONFLICT (key) DO UPDATE SET 
  description = EXCLUDED.description;
-- Migration: Embed Tenants in Contracts
-- Description: Adds a 'tenants' jsonb column to the contracts table to support multiple tenants per contract and removes the need for a separate tenants table.

-- 1. Create a "Guest Leads" user system entry if not exists
-- We use a fixed UUID for the "System Guest" to route anonymous emails.
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000000' OR email = 'guest-leads@rentmate.co.il') THEN
        INSERT INTO auth.users (id, email, raw_user_meta_data, created_at)
        VALUES (
          '00000000-0000-0000-0000-000000000000', 
          'guest-leads@rentmate.co.il', 
          '{"full_name": "Potential Lead"}'::jsonb, 
          NOW()
        );
    END IF;
END $$;

-- 2. Ensure profile exists for routing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = '00000000-0000-0000-0000-000000000000' OR email = 'guest-leads@rentmate.co.il') THEN
        INSERT INTO public.user_profiles (id, email, full_name, first_name, last_name, role)
        VALUES (
          '00000000-0000-0000-0000-000000000000', 
          'guest-leads@rentmate.co.il', 
          'Potential Lead', 
          'Potential',
          'Lead',
          'user'
        );
    END IF;
END $$;

    -- 2. Ensure 'subscription_plans' has the 'free' plan
    INSERT INTO public.subscription_plans (id, name, price_monthly, max_properties, features)
    VALUES ('free', 'Free Forever', 0, 1, '{"support_level": "basic"}'::jsonb)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_profiles (
        id, 
        email, 
        full_name,
        first_name,
        last_name,
        role, 
        subscription_status, 
        plan_id
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.raw_user_meta_data->>'full_name', ' ', 1), 'User'),
        COALESCE(NEW.raw_user_meta_data->>'last_name', 'User'),
        'user', -- Default role
        'active', -- Default status
        default_plan_id
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
        updated_at = NOW();

-- Update existing or insert new settings
INSERT INTO public.system_settings (key, value, description)
VALUES 
    ('auto_autopilot_master_enabled', 'false'::jsonb, 'Master switch for all background automation logic (Lease expiry, overdue rent, etc).'),
    ('auto_monthly_reports_enabled', 'false'::jsonb, 'Whether to automatically generate monthly performance notifications for property owners.')
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value,
    description = EXCLUDED.description;

-- 3. Seed Construction Inputs Index (Series 200010, Base 2011=100)
-- [Index Data Stripped]
-- 4. Seed Housing Price Index (Series 40010)
-- [Index Data Stripped]
-- 5. Seed Exchange Rates (USD/EUR)
-- [Index Data Stripped]
-- 6. Insert Base Periods & Chain Factors
INSERT INTO index_bases (index_type, base_period_start, base_value, chain_factor)
VALUES 
    -- Construction
    ('construction', '2011-08-01', 100.0, 1.0),
    -- CPI common bases
    ('cpi', '2025-01-01', 100.0, 1.074),
    ('cpi', '2023-01-01', 100.0, 1.026),
    ('cpi', '2021-01-01', 100.0, 1.0)
ON CONFLICT (index_type, base_period_start) DO UPDATE 
SET base_value = EXCLUDED.base_value, chain_factor = EXCLUDED.chain_factor;

    INSERT INTO public.user_profiles (
        id, 
        email, 
        full_name,
        first_name,
        last_name,
        phone,
        role, 
        subscription_status, 
        plan_id
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.raw_user_meta_data->>'full_name', ' ', 1), 'User'),
        COALESCE(NEW.raw_user_meta_data->>'last_name', 'User'),
        NEW.phone,
        'user', 
        'active', 
        default_plan_id
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
        phone = COALESCE(EXCLUDED.phone, user_profiles.phone),
        updated_at = NOW();

-- Seed with known CBS base transitions
-- Source: Central Bureau of Statistics official publications
INSERT INTO chaining_factors (index_type, from_base, to_base, factor, effective_date) VALUES
    -- CPI (Consumer Price Index) transitions
    ('cpi', '2020', '2024', 1.0234, '2024-01-01'),
    ('cpi', '2018', '2020', 1.0156, '2020-01-01'),
    ('cpi', '2012', '2018', 1.0089, '2018-01-01'),

-- 2. Ensure 'free' plan exists in subscription_plans
INSERT INTO public.subscription_plans (id, name, price_monthly, max_properties)
VALUES ('free', 'Free Forever', 0, 1)
ON CONFLICT (id) DO NOTHING;

    -- Insert or Update Profile
    INSERT INTO public.user_profiles (
        id, 
        email, 
        full_name,
        first_name,
        last_name,
        phone,
        role, 
        subscription_status, 
        plan_id,
        subscription_plan,
        marketing_consent,
        marketing_consent_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        v_full_name,
        v_first_name,
        v_last_name,
        NEW.phone,
        'user', 
        'active', 
        v_plan_id,
        'free_forever', -- Legacy field support
        COALESCE((NEW.raw_user_meta_data->>'marketing_consent')::boolean, FALSE),
        CASE WHEN (NEW.raw_user_meta_data->>'marketing_consent')::boolean THEN NOW() ELSE NULL END
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
        first_name = COALESCE(EXCLUDED.first_name, user_profiles.first_name),
        last_name = COALESCE(EXCLUDED.last_name, user_profiles.last_name),
        phone = COALESCE(EXCLUDED.phone, user_profiles.phone),
        updated_at = NOW();

    -- Create User Profile with UPSERT to handle edge cases
    INSERT INTO public.user_profiles (
        id, 
        email, 
        full_name,
        first_name,
        last_name,
        role, 
        subscription_status, 
        plan_id
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', ''), ' ', 1),
        split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', ''), ' ', 2),
        'user',
        'active',
        selected_plan
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
        first_name = COALESCE(EXCLUDED.first_name, user_profiles.first_name),
        last_name = COALESCE(EXCLUDED.last_name, user_profiles.last_name),
        plan_id = COALESCE(selected_plan, user_profiles.plan_id),
        updated_at = NOW();

-- Seed data for major Israeli cities/areas
INSERT INTO public.rental_market_data (region_name, avg_rent, growth_1y, growth_2y, growth_5y, month_over_month, room_adjustments, type_adjustments)
VALUES 
    ('Jerusalem', 5200, 9.4, 18.2, 32.5, 0.8, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.4, "house": 1.8}'),
    ('Tel Aviv', 6800, -2.8, 12.5, 45.0, -0.2, '{"2": 0.85, "3": 1.0, "4": 1.3, "5": 1.6}', '{"apartment": 1.0, "penthouse": 1.6, "house": 2.2}'),
    ('Haifa', 3800, 0.5, 6.2, 15.0, 0.1, '{"2": 0.7, "3": 1.0, "4": 1.25, "5": 1.55}', '{"apartment": 1.0, "penthouse": 1.3, "house": 1.6}'),
    ('Rishon LeZion', 5400, -1.5, 9.2, 24.5, -0.1, '{"2": 0.8, "3": 1.0, "4": 1.3, "5": 1.6}', '{"apartment": 1.0, "penthouse": 1.4, "house": 1.9}'),
    ('Petah Tikva', 5100, -0.8, 11.4, 29.0, 0.05, '{"2": 0.75, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.35, "house": 1.8}'),
    ('Netanya', 4800, 4.2, 7.5, 19.5, 0.3, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.5, "house": 2.0}'),
    ('Holon', 4900, 2.1, 8.5, 22.0, 0.2, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.4, "house": 1.8}'),
    ('Bat Yam', 4500, 3.5, 10.2, 28.0, 0.4, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.4, "house": 1.7}'),
    ('Ramat Gan', 5600, -1.2, 10.5, 35.0, -0.1, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.5, "house": 2.0}'),
    ('Givatayim', 5900, -0.5, 12.0, 38.0, 0.0, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.5, "house": 2.1}'),
    ('Ashdod', 4200, 4.8, 9.5, 21.0, 0.5, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.3, "house": 1.7}'),
    ('Ashkelon', 3600, 6.2, 12.0, 25.0, 0.6, '{"2": 0.8, "3": 1.0, "4": 1.2, "5": 1.4}', '{"apartment": 1.0, "penthouse": 1.2, "house": 1.5}'),
    ('Beer Sheba', 3400, 3.1, 7.5, 18.0, 0.3, '{"2": 0.8, "3": 1.0, "4": 1.2, "5": 1.4}', '{"apartment": 1.0, "penthouse": 1.2, "house": 1.5}'),
    ('Herzliya', 6500, -3.2, 11.0, 42.0, -0.2, '{"2": 0.85, "3": 1.0, "4": 1.3, "5": 1.6}', '{"apartment": 1.0, "penthouse": 1.6, "house": 2.2}'),
    ('Ra''anana', 5800, -1.8, 9.5, 28.0, -0.1, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.5, "house": 2.0}'),
    ('Kfar Saba', 5200, 1.5, 8.2, 24.0, 0.2, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.4, "house": 1.8}'),
    ('Modi''in', 5400, 2.4, 10.0, 26.0, 0.3, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.4, "house": 1.8}'),
    ('Rehovot', 4600, 4.1, 9.2, 23.5, 0.4, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.4, "house": 1.8}'),
    ('Bnei Brak', 4800, 5.5, 12.5, 31.0, 0.6, '{"2": 0.8, "3": 1.0, "4": 1.2, "5": 1.4}', '{"apartment": 1.0, "penthouse": 1.3, "house": 1.6}'),
    ('Beit Shemesh', 4400, 6.8, 14.2, 35.0, 0.7, '{"2": 0.8, "3": 1.0, "4": 1.2, "5": 1.4}', '{"apartment": 1.0, "penthouse": 1.3, "house": 1.6}'),
    ('Hadera', 4100, 5.2, 10.5, 22.0, 0.5, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.4, "house": 1.7}'),
    ('Lod', 3800, 4.5, 9.8, 20.0, 0.4, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.3, "house": 1.6}'),
    ('Ramla', 3700, 4.2, 9.5, 19.5, 0.3, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.3, "house": 1.6}'),
    ('Hod HaSharon', 5600, 1.2, 8.5, 26.0, 0.1, '{"2": 0.8, "3": 1.0, "4": 1.3, "5": 1.6}', '{"apartment": 1.0, "penthouse": 1.5, "house": 2.0}'),
    ('Kiryat Ono', 5500, 2.8, 9.2, 27.5, 0.2, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.4, "house": 1.9}'),
    ('Ness Ziona', 5300, 3.2, 9.8, 25.0, 0.3, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.4, "house": 1.8}'),
    ('Akko', 3300, 2.4, 6.5, 16.0, 0.2, '{"2": 0.8, "3": 1.0, "4": 1.2, "5": 1.4}', '{"apartment": 1.0, "penthouse": 1.2, "house": 1.5}'),
    ('Eilat', 3900, 1.5, 5.8, 14.5, 0.1, '{"2": 0.85, "3": 1.0, "4": 1.2, "5": 1.4}', '{"apartment": 1.0, "penthouse": 1.3, "house": 1.6}'),
    ('Central', 4900, -2.9, 8.4, 28.0, -0.1, '{"2": 0.75, "3": 1.0, "4": 1.2, "5": 1.45}', '{"apartment": 1.0, "penthouse": 1.35, "house": 1.7}'),
    ('North', 3500, 5.4, 10.5, 22.0, 0.4, '{"2": 0.8, "3": 1.0, "4": 1.2, "5": 1.4}', '{"apartment": 1.0, "penthouse": 1.2, "house": 1.5}'),
    ('South', 3600, 1.2, 4.5, 18.0, 0.2, '{"2": 0.8, "3": 1.0, "4": 1.2, "5": 1.4}', '{"apartment": 1.0, "penthouse": 1.2, "house": 1.5}')
ON CONFLICT (region_name) DO UPDATE SET 
    avg_rent = EXCLUDED.avg_rent,
    growth_1y = EXCLUDED.growth_1y,
    growth_2y = EXCLUDED.growth_2y,
    growth_5y = EXCLUDED.growth_5y,
    month_over_month = EXCLUDED.month_over_month,
    room_adjustments = EXCLUDED.room_adjustments,
    type_adjustments = EXCLUDED.type_adjustments,
    updated_at = NOW();
-- Migration: enhance_subscription_marketing
-- Description: Adds marketing-focused columns to subscription_plans table.

-- 2. Ensure the keys exist as fallbacks in system_settings if they aren't there
INSERT INTO public.system_settings (key, value, description)
SELECT 'supabase_project_ref', '"tipnjnfbbnbskdlodrww"'::jsonb, 'Supabase Project Reference'
WHERE NOT EXISTS (SELECT 1 FROM public.system_settings WHERE key = 'supabase_project_ref');

INSERT INTO public.system_settings (key, value, description)
SELECT 'supabase_service_role_key', ('"' || current_setting('app.settings.service_role_key', true) || '"')::jsonb, 'Supabase Service Role Key'
WHERE NOT EXISTS (SELECT 1 FROM public.system_settings WHERE key = 'supabase_service_role_key')
AND current_setting('app.settings.service_role_key', true) IS NOT NULL;
-- Migration: final_reliable_cron_and_schema_fix
-- Description: Repairs the properties table and hardens the daily admin summary cron job.

-- 4. Sync configuration in system_settings
INSERT INTO public.system_settings (key, value, description)
VALUES 
    ('supabase_project_ref', '"tipnjnfbbnbskdlodrww"', 'Supabase Project Reference'),
    ('admin_email_daily_summary_enabled', 'true'::jsonb, 'Master toggle for daily admin summary email')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

    -- 3. Check if allowed
    IF v_limit = -1 OR (v_current_usage + 1) <= v_limit THEN
        -- Log the usage
        INSERT INTO public.whatsapp_usage_logs (user_id, conversation_id)
        VALUES (p_user_id, p_conversation_id);

    INSERT INTO public.user_profiles (
        id, 
        email, 
        full_name,
        first_name,
        last_name,
        phone,
        role, 
        subscription_status, 
        plan_id
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.raw_user_meta_data->>'full_name', ' ', 1), 'User'),
        COALESCE(NEW.raw_user_meta_data->>'last_name', 'User'),
        v_phone,
        'user', 
        'active', 
        COALESCE(NEW.raw_user_meta_data->>'plan_id', default_plan_id)
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
        phone = COALESCE(EXCLUDED.phone, user_profiles.phone),
        updated_at = NOW();

INSERT INTO public.system_settings (key, value, description)
VALUES 
    ('security_alerts_enabled', 'true'::jsonb, 'Master switch for automated abuse detection alerts (Email/WhatsApp).'),
    ('admin_security_whatsapp', '"972500000000"'::jsonb, 'Admin phone number for WhatsApp security alerts. Format: CountryCode + Number (e.g., 972...)'),
    ('admin_security_email', '"rubi@rentmate.co.il"'::jsonb, 'Admin email for receiving security audit reports.')
ON CONFLICT (key) DO UPDATE SET 
    description = EXCLUDED.description;
-- Add disclaimer_accepted to user_preferences
-- Defaults to FALSE

