-- Create index_data table for storing economic indices
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
  USING (true)
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE index_data IS 'Stores economic indices (CPI, Housing, Construction, USD, EUR) fetched from CBS and exchange APIs';
