-- Create table for short URLs
CREATE TABLE IF NOT EXISTS calculation_shares (
    id TEXT PRIMARY KEY, -- Short ID (e.g., "abc123")
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    calculation_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    view_count INTEGER DEFAULT 0
);

-- Index for cleanup
CREATE INDEX IF NOT EXISTS idx_calculation_shares_expires ON calculation_shares(expires_at);

-- RLS Policies
ALTER TABLE calculation_shares ENABLE ROW LEVEL SECURITY;

-- Anyone can read (public shares)
CREATE POLICY "Public can view calculation shares"
    ON calculation_shares FOR SELECT
    USING (true);

-- Authenticated users can create
CREATE POLICY "Authenticated users can create shares"
    ON calculation_shares FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own shares (for view count)
CREATE POLICY "Anyone can update view count"
    ON calculation_shares FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Function to generate short ID
CREATE OR REPLACE FUNCTION generate_short_id(length INTEGER DEFAULT 6)
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..length LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to create short URL
CREATE OR REPLACE FUNCTION create_calculation_share(p_calculation_data JSONB)
RETURNS TEXT AS $$
DECLARE
    v_short_id TEXT;
    v_max_attempts INTEGER := 10;
    v_attempt INTEGER := 0;
BEGIN
    LOOP
        v_short_id := generate_short_id(6);
        
        -- Try to insert
        BEGIN
            INSERT INTO calculation_shares (id, user_id, calculation_data)
            VALUES (v_short_id, auth.uid(), p_calculation_data);
            
            RETURN v_short_id;
        EXCEPTION WHEN unique_violation THEN
            v_attempt := v_attempt + 1;
            IF v_attempt >= v_max_attempts THEN
                RAISE EXCEPTION 'Failed to generate unique short ID after % attempts', v_max_attempts;
            END IF;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup function for expired shares
CREATE OR REPLACE FUNCTION cleanup_expired_shares()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM calculation_shares
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE calculation_shares IS 'Stores calculation data for short shareable URLs';
COMMENT ON COLUMN calculation_shares.id IS 'Short ID used in URL (e.g., abc123)';
COMMENT ON COLUMN calculation_shares.expires_at IS 'When this share link expires (default 30 days)';
COMMENT ON FUNCTION create_calculation_share IS 'Creates a new short URL for a calculation';
COMMENT ON FUNCTION cleanup_expired_shares IS 'Removes expired share links';
