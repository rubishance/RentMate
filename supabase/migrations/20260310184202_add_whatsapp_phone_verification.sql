-- Add phone number fields to user_profiles for WhatsApp integration
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS phone_number text UNIQUE,
ADD COLUMN IF NOT EXISTS phone_verified boolean DEFAULT false;

-- Create an index to make looking up users by phone number fast for the webhook
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone_number ON public.user_profiles(phone_number);

-- Update the comments
COMMENT ON COLUMN public.user_profiles.phone_number IS 'User phone number for WhatsApp communication';
COMMENT ON COLUMN public.user_profiles.phone_verified IS 'Whether the phone number has been verified via OTP';
