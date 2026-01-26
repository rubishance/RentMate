-- Add ai_data_consent to user_preferences
-- Defaults to FALSE for privacy

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'ai_data_consent') THEN
        ALTER TABLE user_preferences 
        ADD COLUMN ai_data_consent BOOLEAN DEFAULT false;
    END IF;
END $$;
