-- Create human_conversations table
CREATE TABLE IF NOT EXISTS public.human_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create human_messages table
CREATE TABLE IF NOT EXISTS public.human_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.human_conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'admin')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.human_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.human_messages ENABLE ROW LEVEL SECURITY;

-- Policies for humman_conversations
CREATE POLICY "Admins can view all conversations"
    ON public.human_conversations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can insert conversations"
    ON public.human_conversations
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update conversations"
    ON public.human_conversations
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can view their own conversations"
    ON public.human_conversations
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policies for human_messages
CREATE POLICY "Admins can view all messages"
    ON public.human_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can insert messages"
    ON public.human_messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can view messages in their conversations"
    ON public.human_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.human_conversations
            WHERE id = human_messages.conversation_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert messages in their active conversations"
    ON public.human_messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.human_conversations
            WHERE id = human_messages.conversation_id 
            AND user_id = auth.uid()
            AND status = 'active'
        )
    );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_human_conversations_user_id ON public.human_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_human_messages_conversation_id ON public.human_messages(conversation_id);
