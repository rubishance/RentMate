-- Add balcony and safe room (ממ"ד) columns to properties table
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS has_balcony BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_safe_room BOOLEAN DEFAULT false;

-- Add helpful comments
COMMENT ON COLUMN public.properties.has_balcony IS 'Whether the property has a balcony';
COMMENT ON COLUMN public.properties.has_safe_room IS 'Whether the property has a safe room (MAMAD)';
