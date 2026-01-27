-- Safely add missing columns to properties table
DO $$
BEGIN
    -- Add has_parking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'has_parking') THEN
        ALTER TABLE properties ADD COLUMN has_parking BOOLEAN DEFAULT false;
    END IF;

    -- Add has_storage
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'has_storage') THEN
        ALTER TABLE properties ADD COLUMN has_storage BOOLEAN DEFAULT false;
    END IF;

    -- Add property_type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'property_type') THEN
        ALTER TABLE properties ADD COLUMN property_type TEXT DEFAULT 'apartment';
    END IF;

    -- Add image_url
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'image_url') THEN
        ALTER TABLE properties ADD COLUMN image_url TEXT;
    END IF;
END $$;

-- Update constraint for property_type
DO $$
BEGIN
    ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_property_type_check;
    ALTER TABLE properties ADD CONSTRAINT properties_property_type_check 
    CHECK (property_type IN ('apartment', 'penthouse', 'garden', 'house', 'other'));
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;
