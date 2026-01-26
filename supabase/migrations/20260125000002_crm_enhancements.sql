-- Migration: Enhance CRM Interactions with Metadata and Human Chat
-- Adds metadata support for external links (Gmail etc.) and prepares human chat types

-- 1. Add metadata column to crm_interactions
ALTER TABLE public.crm_interactions 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Add 'whatsapp' and 'text' to crm_interaction_type if needed
-- Note: 'chat' is already used for Bot, we'll use 'human_chat' for manual entries or real-time human chat
DO $$ 
BEGIN
    ALTER TYPE crm_interaction_type ADD VALUE IF NOT EXISTS 'human_chat';
    ALTER TYPE crm_interaction_type ADD VALUE IF NOT EXISTS 'whatsapp';
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- 3. Create Human Chat Tables for real-time support (Phase 3 Prep)
CREATE TABLE IF NOT EXISTS public.human_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.human_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.human_conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    sender_role TEXT CHECK (sender_role IN ('user', 'admin')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Human Chats
ALTER TABLE public.human_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.human_messages ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins manage human conversations" ON public.human_conversations
AS PERMISSIVE FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins manage human messages" ON public.human_messages
AS PERMISSIVE FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- Users can see their own conversations
CREATE POLICY "Users view own human conversations" ON public.human_conversations
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users view/send own human messages" ON public.human_messages
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.human_conversations 
        WHERE id = public.human_messages.conversation_id AND user_id = auth.uid()
    )
);
