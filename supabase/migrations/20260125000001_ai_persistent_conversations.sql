-- AI Conversations Table (Compact Mode)
CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    messages JSONB DEFAULT '[]'::jsonb,
    total_cost_usd NUMERIC(10, 6) DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

-- Users can manage their own conversations
CREATE POLICY "Users can view own AI conversations"
    ON public.ai_conversations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own AI conversations"
    ON public.ai_conversations FOR DELETE
    USING (auth.uid() = user_id);

-- Admins can view everything
CREATE POLICY "Admins can view all AI conversations"
    ON public.ai_conversations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RPC to safely append messages and update cost
-- This prevents race conditions and handles the JSONB manipulation on the server
CREATE OR REPLACE FUNCTION public.append_ai_messages(
    p_conversation_id UUID,
    p_new_messages JSONB,
    p_cost_usd NUMERIC DEFAULT 0,
    p_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_conv_id UUID;
    v_final_user_id UUID;
BEGIN
    -- Determine user ID: prefer explicit, fallback to auth.uid()
    v_final_user_id := COALESCE(p_user_id, auth.uid());

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

    RETURN v_conv_id;
END;
$$;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_updated ON ai_conversations(updated_at);
