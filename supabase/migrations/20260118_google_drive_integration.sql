-- Google Drive Integration: Add storage preferences to user_profiles
-- Migration: 20260118_google_drive_integration.sql

-- Add Google Drive related columns to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS google_drive_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS google_drive_folder_id TEXT,
ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS storage_preference TEXT DEFAULT 'supabase' CHECK (storage_preference IN ('supabase', 'google_drive', 'both'));

-- Add comment
COMMENT ON COLUMN public.user_profiles.google_drive_enabled IS 'Whether user has connected Google Drive';
COMMENT ON COLUMN public.user_profiles.google_drive_folder_id IS 'ID of the RentMate folder in user''s Google Drive';
COMMENT ON COLUMN public.user_profiles.google_refresh_token IS 'Encrypted Google OAuth refresh token';
COMMENT ON COLUMN public.user_profiles.storage_preference IS 'User''s preferred storage location: supabase, google_drive, or both';
