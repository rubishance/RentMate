-- Add elevator and accessibility columns to properties table
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS has_elevator BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_accessible BOOLEAN DEFAULT false;

-- Add helpful comments
COMMENT ON COLUMN public.properties.has_elevator IS 'Whether the property building has an elevator';
COMMENT ON COLUMN public.properties.is_accessible IS 'Whether the property is handicap accessible';
