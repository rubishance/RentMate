-- Add disclaimer_accepted to user_preferences
-- Defaults to FALSE

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'disclaimer_accepted') THEN
        ALTER TABLE user_preferences 
        ADD COLUMN disclaimer_accepted BOOLEAN DEFAULT false;
    END IF;
END $$;
