-- Comprehensive Property Documents Category Check Constraint
-- Migration: 20260325000003_comprehensive_property_documents_categories.sql

ALTER TABLE property_documents DROP CONSTRAINT IF EXISTS property_documents_category_check;

ALTER TABLE property_documents ADD CONSTRAINT property_documents_category_check 
CHECK (category IN (
    'photo',
    'video',
    'utility_water',
    'utility_electric',
    'utility_gas',
    'utility_municipality',
    'utility_management',
    'utility_internet',
    'utility_cable',
    'utility_tv',
    'utility_mortgage',
    'utility_other',
    'maintenance',
    'invoice',
    'receipt',
    'checks',
    'insurance',
    'warranty',
    'legal',
    'protocols',
    'contract',
    'id_card',
    'other'
));
