-- Create short_links table for URL shortener
-- Migration: 20260119_create_short_links.sql

CREATE TABLE IF NOT EXISTS public.short_links (
    slug TEXT PRIMARY KEY,
    original_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now() + interval '90 days') NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL -- Optional: track who created it
);

-- Enable RLS
ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;

-- Allow public read access (anyone with the link can use it)
CREATE POLICY "Public can read short links"
ON public.short_links FOR SELECT
USING (true);

-- Allow public insert access (since the calculator allows sharing without login, technically)
-- Alternatively, if we want to restrict generation to logged-in users, change this.
-- Assuming internal tool for now, but user requirement "without keeping every calculation" 
-- implies ephemeral nature. We'll allow public insert for now to support non-logged-in sharing 
-- if that's a use case, OR restrict to authenticated users if the app requires auth.
-- Given RentMate seems to have auth, let's allow authenticated users.
-- UPDATE: User wants to share results. If guest users can use calculator, they need to insert.
-- Let's stick to authenticated for creation to prevent spam, assuming users log in to use the app effectively.
-- If user is guest, we might need a stored procedure or standard anon policy.
-- Adding "Public can insert" with limits would be safer, but for MVP:
CREATE POLICY "Authenticated users can create short links"
ON public.short_links FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Also allow anonymous creation if needed? The user removed server-side calc storage.
-- Let's add anonymous policy for now to be safe with "demo" mode or guest usage.
CREATE POLICY "Public can create short links"
ON public.short_links FOR INSERT
WITH CHECK (true);

-- Auto-cleanup function (optional usually, but good for hygiene)
-- We can rely on `expires_at` in the query `WHERE expires_at > now()`
