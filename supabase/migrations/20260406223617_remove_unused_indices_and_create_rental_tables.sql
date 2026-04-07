-- Clean up unused indices
DELETE FROM public.index_data WHERE index_type IN ('construction', 'usd', 'eur');
DELETE FROM public.index_bases WHERE index_type IN ('construction', 'usd', 'eur');

-- Add new capabilities to rental_market_data for deep segmentation (Safe Room, Rooms, etc.)
ALTER TABLE public.rental_market_data 
ADD COLUMN IF NOT EXISTS detailed_segments JSONB DEFAULT '{}'::jsonb;

-- Create table for tracking User Preferences (Dashboard Widget Cities)
CREATE TABLE IF NOT EXISTS public.user_tracked_regions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  region_name text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, region_name)
);

-- Enable RLS
ALTER TABLE public.user_tracked_regions ENABLE ROW LEVEL SECURITY;

-- Create policies for user tracked regions
CREATE POLICY "Users can fully manage their tracked regions"
  ON public.user_tracked_regions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Optional: grant to anon and authenticated
GRANT ALL ON TABLE public.user_tracked_regions TO authenticated;
GRANT ALL ON TABLE public.user_tracked_regions TO service_role;
