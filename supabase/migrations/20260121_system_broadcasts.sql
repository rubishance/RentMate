-- Create system_broadcasts table
CREATE TABLE IF NOT EXISTS public.system_broadcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success')),
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    target_link TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.system_broadcasts ENABLE ROW LEVEL SECURITY;

-- 1. Viewable by ALL users (even unauthenticated potentially, though usually app users)
CREATE POLICY "Broadcasts are viewable by everyone"
    ON public.system_broadcasts FOR SELECT
    USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- 2. CRUD only for Super Admins
CREATE POLICY "Super Admins have full access to broadcasts"
    ON public.system_broadcasts FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() AND is_super_admin = true
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() AND is_super_admin = true
    ));

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_broadcast_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_system_broadcasts_updated_at
    BEFORE UPDATE ON public.system_broadcasts
    FOR EACH ROW
    EXECUTE PROCEDURE update_broadcast_updated_at();
