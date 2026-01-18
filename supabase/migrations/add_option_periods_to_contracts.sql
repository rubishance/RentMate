-- Add option_periods column to contracts table
-- Use JSONB to store an array of options, e.g., [{"length": 12, "unit": "months"}, {"length": 1, "unit": "years"}]

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'option_periods') THEN
        ALTER TABLE public.contracts ADD COLUMN option_periods JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;
