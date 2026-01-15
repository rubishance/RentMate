-- Create contact_messages table
CREATE TABLE IF NOT EXISTS public.contact_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    user_email TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT contact_messages_pkey PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own messages"
    ON contact_messages FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own messages"
    ON contact_messages FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Admin policy (if you want admins to see all messages)
CREATE POLICY "Admins can view all messages"
    ON contact_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create index for faster queries
CREATE INDEX idx_contact_messages_user_id ON contact_messages(user_id);
CREATE INDEX idx_contact_messages_status ON contact_messages(status);
CREATE INDEX idx_contact_messages_created_at ON contact_messages(created_at DESC);
