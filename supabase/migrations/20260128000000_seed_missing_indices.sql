-- ==========================================
-- COMPREHENSIVE INDEX SYSTEM INITIALIZATION
-- ==========================================

-- 1. Create index_data table (if missing)
CREATE TABLE IF NOT EXISTS index_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  index_type TEXT NOT NULL CHECK (index_type IN ('cpi', 'housing', 'construction', 'usd', 'eur')),
  date TEXT NOT NULL, -- Format: 'YYYY-MM'
  value DECIMAL(10, 4) NOT NULL,
  source TEXT DEFAULT 'cbs' CHECK (source IN ('cbs', 'exchange-api', 'manual', 'boi')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(index_type, date)
);

-- 2. Create index_bases table (if missing)
CREATE TABLE IF NOT EXISTS index_bases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    index_type TEXT NOT NULL CHECK (index_type IN ('cpi', 'housing', 'construction', 'usd', 'eur')),
    base_period_start DATE NOT NULL,
    base_value NUMERIC NOT NULL DEFAULT 100.0,
    previous_base_period_start DATE,
    chain_factor NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(index_type, base_period_start)
);

-- 3. Seed Construction Inputs Index (Series 200010, Base 2011=100)
INSERT INTO index_data (index_type, date, value, source)
VALUES 
    ('construction', '2025-01', 123.4, 'manual'),
    ('construction', '2024-12', 123.0, 'manual'),
    ('construction', '2024-11', 121.8, 'manual'),
    ('construction', '2024-10', 121.5, 'manual'),
    ('construction', '2024-09', 121.2, 'manual'),
    ('construction', '2024-08', 121.0, 'manual')
ON CONFLICT (index_type, date) DO UPDATE SET value = EXCLUDED.value;

-- 4. Seed Housing Price Index (Series 40010)
INSERT INTO index_data (index_type, date, value, source)
VALUES 
    ('housing', '2025-01', 105.5, 'manual'),
    ('housing', '2024-12', 105.1, 'manual'),
    ('housing', '2024-11', 104.8, 'manual'),
    ('housing', '2024-10', 104.5, 'manual'),
    ('housing', '2024-09', 104.2, 'manual'),
    ('housing', '2024-08', 104.0, 'manual')
ON CONFLICT (index_type, date) DO UPDATE SET value = EXCLUDED.value;

-- 5. Seed Exchange Rates (USD/EUR)
INSERT INTO index_data (index_type, date, value, source)
VALUES 
    ('usd', '2025-01', 3.73, 'manual'),
    ('eur', '2025-01', 4.05, 'manual'),
    ('usd', '2024-12', 3.70, 'manual'),
    ('eur', '2024-12', 4.02, 'manual')
ON CONFLICT (index_type, date) DO UPDATE SET value = EXCLUDED.value;

-- 6. Insert Base Periods & Chain Factors
INSERT INTO index_bases (index_type, base_period_start, base_value, chain_factor)
VALUES 
    -- Construction
    ('construction', '2011-08-01', 100.0, 1.0),
    -- CPI common bases
    ('cpi', '2025-01-01', 100.0, 1.074),
    ('cpi', '2023-01-01', 100.0, 1.026),
    ('cpi', '2021-01-01', 100.0, 1.0)
ON CONFLICT (index_type, base_period_start) DO UPDATE 
SET base_value = EXCLUDED.base_value, chain_factor = EXCLUDED.chain_factor;

-- 7. RLS Policies (Safeguard)
ALTER TABLE index_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE index_bases ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
DO $$ BEGIN
    CREATE POLICY "Allow authenticated read index_data" ON index_data FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow authenticated read index_bases" ON index_bases FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Allow service_role to manage (for Edge Functions)
DO $$ BEGIN
    CREATE POLICY "Allow full access for service_role index_data" ON index_data FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow full access for service_role index_bases" ON index_bases FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
