-- Create Feedback Table
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Nullable for anonymous feedback
    message TEXT NOT NULL,
    type TEXT DEFAULT 'bug', -- 'bug', 'feature', 'other'
    status TEXT DEFAULT 'new', -- 'new', 'in_progress', 'resolved'
    screenshot_url TEXT,
    device_info JSONB
);

-- RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (Anon or Authenticated)
CREATE POLICY "Enable insert for everyone"
ON public.feedback FOR INSERT
TO public, anon, authenticated
WITH CHECK (true);

-- Allow Admins to see all
CREATE POLICY "Admins can view all feedback"
ON public.feedback FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Support updating status by Admins
CREATE POLICY "Admins can update feedback"
ON public.feedback FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Storage Bucket for Screenshots
INSERT INTO storage.buckets (id, name, public) 
VALUES ('feedback-screenshots', 'feedback-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Anyone can upload feedback screenshots"
ON storage.objects FOR INSERT
TO public, anon, authenticated
WITH CHECK ( bucket_id = 'feedback-screenshots' );

CREATE POLICY "Anyone can view feedback screenshots"
ON storage.objects FOR SELECT
TO public, anon, authenticated
USING ( bucket_id = 'feedback-screenshots' );
