-- Create ticket_analysis table
CREATE TABLE IF NOT EXISTS public.ticket_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sentiment_score FLOAT, -- -1.0 to 1.0
    urgency_level TEXT CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')),
    category TEXT,
    confidence_score FLOAT,
    ai_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create automation_rules table (System-wide or Admin managed rules)
CREATE TABLE IF NOT EXISTS public.automation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    trigger_type TEXT NOT NULL, -- 'lease_expiry', 'rent_overdue', 'ticket_created'
    condition JSONB, -- e.g. {"days_before": 60}
    action_type TEXT NOT NULL, -- 'email', 'notification', 'auto_reply'
    action_config JSONB, -- template_id, etc.
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create automation_logs table
CREATE TABLE IF NOT EXISTS public.automation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID REFERENCES public.automation_rules(id),
    user_id UUID REFERENCES auth.users(id), -- Target user
    entity_id UUID, -- contract_id, ticket_id, etc.
    action_taken TEXT,
    status TEXT, -- 'success', 'failed'
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_automation_settings table
CREATE TABLE IF NOT EXISTS public.user_automation_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    lease_expiry_days INTEGER DEFAULT 100,
    extension_notice_days INTEGER DEFAULT 60,
    rent_overdue_days INTEGER DEFAULT 5,
    auto_reply_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add auto_reply_draft to support_tickets
ALTER TABLE public.support_tickets 
ADD COLUMN IF NOT EXISTS auto_reply_draft TEXT;

-- RLS Policies
ALTER TABLE public.ticket_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_automation_settings ENABLE ROW LEVEL SECURITY;

-- Admins can view all ticket analysis
CREATE POLICY "Admins can view all ticket analysis" ON public.ticket_analysis
    FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));

-- Users can view their own automation settings
CREATE POLICY "Users can view own automation settings" ON public.user_automation_settings
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Users can update their own automation settings
CREATE POLICY "Users can update own automation settings" ON public.user_automation_settings
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);

-- Insert policy for user automation settings (so they can create it initially)
CREATE POLICY "Users can insert own automation settings" ON public.user_automation_settings
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Admins can manage automation rules
CREATE POLICY "Admins can manage automation rules" ON public.automation_rules
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()));

-- Admins can view logs
CREATE POLICY "Admins can view automation logs" ON public.automation_logs
    FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));
