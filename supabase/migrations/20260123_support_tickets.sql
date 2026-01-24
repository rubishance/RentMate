-- Support Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('technical', 'billing', 'feature_request', 'bug', 'other')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_user', 'resolved', 'closed')),
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    chat_context JSONB, -- Store the chat conversation that led to the ticket
    resolution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Ticket Comments Table (for back-and-forth communication)
CREATE TABLE IF NOT EXISTS ticket_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);

-- RLS Policies
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;

-- Users can view their own tickets
CREATE POLICY "Users can view own tickets"
    ON support_tickets FOR SELECT
    USING (auth.uid() = user_id);

-- Users can create tickets
CREATE POLICY "Users can create tickets"
    ON support_tickets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own open tickets
CREATE POLICY "Users can update own open tickets"
    ON support_tickets FOR UPDATE
    USING (auth.uid() = user_id AND status = 'open');

-- Admins can view all tickets
CREATE POLICY "Admins can view all tickets"
    ON support_tickets FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update all tickets
CREATE POLICY "Admins can update all tickets"
    ON support_tickets FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Users can view comments on their tickets
CREATE POLICY "Users can view own ticket comments"
    ON ticket_comments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM support_tickets
            WHERE id = ticket_comments.ticket_id AND user_id = auth.uid()
        )
    );

-- Users can add comments to their tickets
CREATE POLICY "Users can comment on own tickets"
    ON ticket_comments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM support_tickets
            WHERE id = ticket_comments.ticket_id AND user_id = auth.uid()
        )
    );

-- Admins can view all comments
CREATE POLICY "Admins can view all comments"
    ON ticket_comments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can add comments to any ticket
CREATE POLICY "Admins can comment on all tickets"
    ON ticket_comments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_support_ticket_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_support_tickets_timestamp
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_support_ticket_timestamp();

-- Function to notify admins of new tickets
CREATE OR REPLACE FUNCTION notify_admins_new_ticket()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert admin notification
    INSERT INTO admin_notifications (type, user_id, content, status)
    VALUES (
        'support_ticket',
        NEW.user_id,
        jsonb_build_object(
            'ticket_id', NEW.id,
            'title', NEW.title,
            'category', NEW.category,
            'priority', NEW.priority
        ),
        'pending'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for admin notifications
CREATE TRIGGER notify_admins_on_new_ticket
    AFTER INSERT ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION notify_admins_new_ticket();
