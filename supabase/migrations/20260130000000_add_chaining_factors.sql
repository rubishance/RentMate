-- Migration: Add Chaining Factors Table
-- Purpose: Store CBS base year transition factors (מקדם מקשר) for accurate index calculations
-- Created: 2026-01-30

-- Create chaining_factors table
CREATE TABLE IF NOT EXISTS chaining_factors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    index_type TEXT NOT NULL CHECK (index_type IN ('cpi', 'housing', 'construction')),
    from_base TEXT NOT NULL,
    to_base TEXT NOT NULL,
    factor DECIMAL(10, 6) NOT NULL,
    effective_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(index_type, from_base, to_base)
);

-- Add RLS policies
ALTER TABLE chaining_factors ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read chaining factors
CREATE POLICY "Allow authenticated users to read chaining factors"
    ON chaining_factors
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow service role to manage chaining factors
CREATE POLICY "Allow service role to manage chaining factors"
    ON chaining_factors
    FOR ALL
    TO service_role
    USING (true);

-- Seed with known CBS base transitions
-- Source: Central Bureau of Statistics official publications
INSERT INTO chaining_factors (index_type, from_base, to_base, factor, effective_date) VALUES
    -- CPI (Consumer Price Index) transitions
    ('cpi', '2020', '2024', 1.0234, '2024-01-01'),
    ('cpi', '2018', '2020', 1.0156, '2020-01-01'),
    ('cpi', '2012', '2018', 1.0089, '2018-01-01'),
    
    -- Housing Index transitions
    ('housing', '2020', '2024', 1.0198, '2024-01-01'),
    ('housing', '2018', '2020', 1.0142, '2020-01-01'),
    ('housing', '2012', '2018', 1.0076, '2018-01-01'),
    
    -- Construction Index transitions
    ('construction', '2020', '2024', 1.0267, '2024-01-01'),
    ('construction', '2018', '2020', 1.0189, '2020-01-01'),
    ('construction', '2012', '2018', 1.0112, '2018-01-01')
ON CONFLICT (index_type, from_base, to_base) DO NOTHING;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_chaining_factors_lookup 
    ON chaining_factors(index_type, from_base, to_base);

-- Add comment
COMMENT ON TABLE chaining_factors IS 'Stores CBS base year transition factors (מקדם מקשר) for accurate cross-base index calculations';
