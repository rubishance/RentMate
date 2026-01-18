-- Add parking and storage columns to properties
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS has_parking BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_storage BOOLEAN DEFAULT false;
