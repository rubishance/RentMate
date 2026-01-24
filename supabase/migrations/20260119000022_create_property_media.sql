-- Create property_media table
CREATE TABLE IF NOT EXISTS public.property_media (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    drive_file_id TEXT NOT NULL,
    drive_web_view_link TEXT NOT NULL,
    drive_thumbnail_link TEXT,
    name TEXT NOT NULL,
    mime_type TEXT,
    size BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.property_media ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own property media"
    ON public.property_media FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own property media"
    ON public.property_media FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own property media"
    ON public.property_media FOR DELETE
    USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_property_media_property_id ON public.property_media(property_id);
CREATE INDEX IF NOT EXISTS idx_property_media_user_id ON public.property_media(user_id);
