-- ============================================
-- Create Contracts Table in Supabase
-- ============================================

-- Create contracts table with proper schema
CREATE TABLE IF NOT EXISTS contracts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid,
    property_address TEXT,
    tenant_name TEXT,
    start_date DATE,
    end_date DATE,
    amount NUMERIC,
    currency TEXT DEFAULT 'ILS',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (for testing)
DROP POLICY IF EXISTS "Allow all on contracts" ON contracts;
CREATE POLICY "Allow all on contracts" 
    ON contracts 
    FOR ALL 
    USING (true) 
    WITH CHECK (true);

-- Verify table was created
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'contracts'
ORDER BY ordinal_position;

SELECT '✅ Contracts table created successfully!' AS status;
