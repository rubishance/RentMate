-- Add property_type column
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS property_type TEXT DEFAULT 'apartment';
