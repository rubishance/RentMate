-- Create table for storing WhatsApp OTPs
CREATE TABLE IF NOT EXISTS public.whatsapp_otps (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    phone_number text NOT NULL,
    otp_code text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone NOT NULL,
    attempts integer DEFAULT 0,
    verified boolean DEFAULT false
);

-- Index for fast lookup by phone number
CREATE INDEX IF NOT EXISTS idx_whatsapp_otps_phone_number ON public.whatsapp_otps(phone_number);

-- RLS policies
ALTER TABLE public.whatsapp_otps ENABLE ROW LEVEL SECURITY;

-- Note: Only Edge Functions using Service Role Key should access this table
-- to verify OTPs. We do not expose this table to the client directly for security.
CREATE POLICY "Enable service role access to whatsapp_otps" ON public.whatsapp_otps
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Also add a function to cleanly delete expired OTPs automatically, 
-- or we can just ignore them based on expires_at and clean them up periodically.
