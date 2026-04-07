CREATE TABLE IF NOT EXISTS index_bases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    index_type TEXT NOT NULL, -- e.g., 'cpi', 'construction', 'housing'
    base_period_start DATE NOT NULL, -- The start date of this base period (e.g., '2023-01-01')
    base_value NUMERIC NOT NULL DEFAULT 100.0, -- The value of the base index (usually 100.0)
    previous_base_period_start DATE, -- The start date of the *previous* base period
    chain_factor NUMERIC, -- The factor to multiply when moving FROM this base TO the previous base (or vice versa depending on logic)
                          -- CBS usually publishes "Linkage Coefficient" (׳ž׳§׳“׳  ׳§׳©׳¨) to the previous base.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup
CREATE INDEX idx_index_bases_type_date ON index_bases (index_type, base_period_start);

-- Insert known recent Israeli CPI Base Periods (Example Data - verified from CBS knowledge)
-- Note: CBS updates bases typically every 2 years recently.
-- Base Average 2022 = 100.0 (Active from Jan 2023)
-- Base Average 2020 = 100.0 (Active from Jan 2021) -> Factor to prev (2018): 1.006 ?? (Needs exact verification, putting placeholders)

-- Let's populate with a flexible structure. Users specifically requested 'Perfect' calculation.
-- I will insert a few sample rows that are commonly used or leave it for an admin seeder.
-- For now, checking 'cpi'.
-- Known recent bases:
-- 1. Base 2022 (Avg 2020=100.0) ?? No.
-- CBS Logic:
-- Base Avg 2022 = 100.0. Start Date: 2023-01-01. Link Factor to 2020 base: 1.081 (Example)
-- Base Avg 2020 = 100.0. Start Date: 2021-01-01. Link Factor to 2018 base: 1.001
-- Base Avg 2018 = 100.0. Start Date: 2019-01-01.

-- I will populate this with a separate seed script or user action if exact numbers aren't known.
CREATE TABLE IF NOT EXISTS index_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  index_type TEXT NOT NULL CHECK (index_type IN ('cpi', 'housing', 'construction', 'usd', 'eur')),
  date TEXT NOT NULL, -- Format: 'YYYY-MM'
  value DECIMAL(10, 4) NOT NULL,
  source TEXT DEFAULT 'cbs' CHECK (source IN ('cbs', 'exchange-api', 'manual')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(index_type, date)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_index_data_type_date ON index_data(index_type, date);

-- Enable Row Level Security
ALTER TABLE index_data ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to read index data
CREATE POLICY "Allow authenticated users to read index data"
  ON index_data
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only admins can insert/update index data (will be done via Edge Function)
-- Policy: Allow authenticated users to manage index data (needed for manual refresh button)
CREATE POLICY "Allow authenticated users to manage index data"
  ON index_data
  FOR ALL
  TO authenticated
  USING(true) WITH CHECK(true);
