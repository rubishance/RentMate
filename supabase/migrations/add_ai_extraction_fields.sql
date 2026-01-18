-- Add extraction fields to contracts table
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS guarantors_info TEXT, -- Summarized text of all guarantors
ADD COLUMN IF NOT EXISTS special_clauses TEXT; -- Summarized text of special clauses

-- Update RLS if needed (usually unrelated to column addition, but good practice to verify)
-- Existing policies should cover these new columns automatically if they are SELECT * / INSERT / UPDATE
