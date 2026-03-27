-- Update Property Documents Category Check Constraint
-- Migration: 20260325000002_update_property_documents_categories.sql

ALTER TABLE property_documents DROP CONSTRAINT IF EXISTS property_documents_category_check;

ALTER TABLE property_documents ADD CONSTRAINT property_documents_category_check 
CHECK (category IN (
    'photo',           -- Property photos
    'video',           -- Property videos
    'utility_water',   -- Water bills
    'utility_electric',-- Electric bills
    'utility_gas',     -- Gas bills
    'utility_municipality', -- Municipality bills (arnona)
    'utility_management',   -- Building management fees
    'utility_other',   -- Other utilities
    'maintenance',     -- Repair/maintenance records
    'invoice',         -- General invoices
    'receipt',         -- Payment receipts
    'checks',          -- Checks / צ'קים
    'insurance',       -- Insurance documents
    'warranty',        -- Warranty documents
    'legal',           -- Legal documents
    'other'            -- Miscellaneous
));
