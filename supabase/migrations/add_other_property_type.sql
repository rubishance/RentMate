-- Migration to add 'other' to the property_type check constraint

-- First, drop the existing check constraint
ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_property_type_check;

-- Re-add the check constraint with 'other' included
ALTER TABLE properties 
ADD CONSTRAINT properties_property_type_check 
CHECK (property_type IN ('apartment', 'penthouse', 'garden', 'house', 'other'));
