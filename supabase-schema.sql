-- RentMate Supabase Database Schema
-- Run this in your Supabase SQL Editor

-- ============================================
-- PROPERTIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS properties (
    id BIGSERIAL PRIMARY KEY,
    address TEXT NOT NULL,
    city TEXT,
    status TEXT,
    price NUMERIC DEFAULT 0,
    rooms INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TENANTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tenants (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    property_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CONTRACTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS contracts (
    id BIGSERIAL PRIMARY KEY,
    property_address TEXT,
    tenant_name TEXT,
    start_date DATE,
    end_date DATE,
    amount NUMERIC,
    currency TEXT DEFAULT 'ILS',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FILES TABLE (for contract uploads)
-- ============================================
CREATE TABLE IF NOT EXISTS files (
    id BIGSERIAL PRIMARY KEY,
    contract_id BIGINT REFERENCES contracts(id) ON DELETE CASCADE,
    name TEXT,
    type TEXT,
    size INTEGER,
    url TEXT,
    storage_path TEXT,
    upload_date TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE POLICIES (Allow all for now - tighten later with auth)
-- ============================================

-- Properties policies
DROP POLICY IF EXISTS "Allow all on properties" ON properties;
CREATE POLICY "Allow all on properties" 
    ON properties 
    FOR ALL 
    USING (true) 
    WITH CHECK (true);

-- Tenants policies
DROP POLICY IF EXISTS "Allow all on tenants" ON tenants;
CREATE POLICY "Allow all on tenants" 
    ON tenants 
    FOR ALL 
    USING (true) 
    WITH CHECK (true);

-- Contracts policies
DROP POLICY IF EXISTS "Allow all on contracts" ON contracts;
CREATE POLICY "Allow all on contracts" 
    ON contracts 
    FOR ALL 
    USING (true) 
    WITH CHECK (true);

-- Settings policies
DROP POLICY IF EXISTS "Allow all on settings" ON settings;
CREATE POLICY "Allow all on settings" 
    ON settings 
    FOR ALL 
    USING (true) 
    WITH CHECK (true);

-- Files policies
DROP POLICY IF EXISTS "Allow all on files" ON files;
CREATE POLICY "Allow all on files" 
    ON files 
    FOR ALL 
    USING (true) 
    WITH CHECK (true);

-- ============================================
-- CREATE STORAGE BUCKET FOR CONTRACT FILES
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('contract-files', 'contract-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy for contract files
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
CREATE POLICY "Allow public uploads"
    ON storage.objects
    FOR ALL
    USING (bucket_id = 'contract-files')
    WITH CHECK (bucket_id = 'contract-files');

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT 'Database schema created successfully!' AS status;
