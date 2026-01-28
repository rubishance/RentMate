-- Add Google Drive integration columns to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS google_drive_folder_id TEXT,
ADD COLUMN IF NOT EXISTS google_drive_enabled BOOLEAN DEFAULT FALSE;

-- Add index for performance if needed
CREATE INDEX IF NOT EXISTS idx_user_profiles_google_enabled ON user_profiles(google_drive_enabled);
