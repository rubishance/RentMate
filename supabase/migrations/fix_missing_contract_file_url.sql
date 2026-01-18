-- Ensure contract_file_url exists on contracts table
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS contract_file_url TEXT;

COMMENT ON COLUMN contracts.contract_file_url IS 'Supabase storage URL for the original contract file';
