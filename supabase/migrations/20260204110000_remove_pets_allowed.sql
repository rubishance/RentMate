-- Remove pets_allowed column from contracts table
ALTER TABLE contracts DROP COLUMN IF EXISTS pets_allowed;
