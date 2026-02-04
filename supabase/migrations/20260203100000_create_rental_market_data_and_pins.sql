-- Migration: Create rental market data table and update user preferences
-- Create table for rental market trends
CREATE TABLE IF NOT EXISTS public.rental_market_data (
    region_name TEXT PRIMARY KEY,
    avg_rent NUMERIC NOT NULL,
    growth_1y NUMERIC DEFAULT 0,
    growth_2y NUMERIC DEFAULT 0,
    growth_5y NUMERIC DEFAULT 0,
    month_over_month NUMERIC DEFAULT 0,
    room_adjustments JSONB NOT NULL DEFAULT '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}'::jsonb,
    type_adjustments JSONB NOT NULL DEFAULT '{"apartment": 1.0, "penthouse": 1.4, "house": 1.8}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on rental_market_data
ALTER TABLE public.rental_market_data ENABLE ROW LEVEL SECURITY;

-- Allow public read access to market data
CREATE POLICY "Allow public read access to rental market data"
    ON public.rental_market_data
    FOR SELECT
    TO public
    USING (true);

-- Add pinned_cities to user_preferences
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'pinned_cities') THEN
        ALTER TABLE public.user_preferences ADD COLUMN pinned_cities JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Seed data for major Israeli cities/areas
INSERT INTO public.rental_market_data (region_name, avg_rent, growth_1y, growth_2y, growth_5y, month_over_month, room_adjustments, type_adjustments)
VALUES 
    ('Jerusalem', 5200, 9.4, 18.2, 32.5, 0.8, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.4, "house": 1.8}'),
    ('Tel Aviv', 6800, -2.8, 12.5, 45.0, -0.2, '{"2": 0.85, "3": 1.0, "4": 1.3, "5": 1.6}', '{"apartment": 1.0, "penthouse": 1.6, "house": 2.2}'),
    ('Haifa', 3800, 0.5, 6.2, 15.0, 0.1, '{"2": 0.7, "3": 1.0, "4": 1.25, "5": 1.55}', '{"apartment": 1.0, "penthouse": 1.3, "house": 1.6}'),
    ('Rishon LeZion', 5400, -1.5, 9.2, 24.5, -0.1, '{"2": 0.8, "3": 1.0, "4": 1.3, "5": 1.6}', '{"apartment": 1.0, "penthouse": 1.4, "house": 1.9}'),
    ('Petah Tikva', 5100, -0.8, 11.4, 29.0, 0.05, '{"2": 0.75, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.35, "house": 1.8}'),
    ('Netanya', 4800, 4.2, 7.5, 19.5, 0.3, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.5, "house": 2.0}'),
    ('Holon', 4900, 2.1, 8.5, 22.0, 0.2, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.4, "house": 1.8}'),
    ('Bat Yam', 4500, 3.5, 10.2, 28.0, 0.4, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.4, "house": 1.7}'),
    ('Ramat Gan', 5600, -1.2, 10.5, 35.0, -0.1, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.5, "house": 2.0}'),
    ('Givatayim', 5900, -0.5, 12.0, 38.0, 0.0, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.5, "house": 2.1}'),
    ('Ashdod', 4200, 4.8, 9.5, 21.0, 0.5, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.3, "house": 1.7}'),
    ('Ashkelon', 3600, 6.2, 12.0, 25.0, 0.6, '{"2": 0.8, "3": 1.0, "4": 1.2, "5": 1.4}', '{"apartment": 1.0, "penthouse": 1.2, "house": 1.5}'),
    ('Beer Sheba', 3400, 3.1, 7.5, 18.0, 0.3, '{"2": 0.8, "3": 1.0, "4": 1.2, "5": 1.4}', '{"apartment": 1.0, "penthouse": 1.2, "house": 1.5}'),
    ('Herzliya', 6500, -3.2, 11.0, 42.0, -0.2, '{"2": 0.85, "3": 1.0, "4": 1.3, "5": 1.6}', '{"apartment": 1.0, "penthouse": 1.6, "house": 2.2}'),
    ('Ra''anana', 5800, -1.8, 9.5, 28.0, -0.1, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.5, "house": 2.0}'),
    ('Kfar Saba', 5200, 1.5, 8.2, 24.0, 0.2, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.4, "house": 1.8}'),
    ('Modi''in', 5400, 2.4, 10.0, 26.0, 0.3, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.4, "house": 1.8}'),
    ('Rehovot', 4600, 4.1, 9.2, 23.5, 0.4, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.4, "house": 1.8}'),
    ('Bnei Brak', 4800, 5.5, 12.5, 31.0, 0.6, '{"2": 0.8, "3": 1.0, "4": 1.2, "5": 1.4}', '{"apartment": 1.0, "penthouse": 1.3, "house": 1.6}'),
    ('Beit Shemesh', 4400, 6.8, 14.2, 35.0, 0.7, '{"2": 0.8, "3": 1.0, "4": 1.2, "5": 1.4}', '{"apartment": 1.0, "penthouse": 1.3, "house": 1.6}'),
    ('Hadera', 4100, 5.2, 10.5, 22.0, 0.5, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.4, "house": 1.7}'),
    ('Lod', 3800, 4.5, 9.8, 20.0, 0.4, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.3, "house": 1.6}'),
    ('Ramla', 3700, 4.2, 9.5, 19.5, 0.3, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.3, "house": 1.6}'),
    ('Hod HaSharon', 5600, 1.2, 8.5, 26.0, 0.1, '{"2": 0.8, "3": 1.0, "4": 1.3, "5": 1.6}', '{"apartment": 1.0, "penthouse": 1.5, "house": 2.0}'),
    ('Kiryat Ono', 5500, 2.8, 9.2, 27.5, 0.2, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.4, "house": 1.9}'),
    ('Ness Ziona', 5300, 3.2, 9.8, 25.0, 0.3, '{"2": 0.8, "3": 1.0, "4": 1.25, "5": 1.5}', '{"apartment": 1.0, "penthouse": 1.4, "house": 1.8}'),
    ('Akko', 3300, 2.4, 6.5, 16.0, 0.2, '{"2": 0.8, "3": 1.0, "4": 1.2, "5": 1.4}', '{"apartment": 1.0, "penthouse": 1.2, "house": 1.5}'),
    ('Eilat', 3900, 1.5, 5.8, 14.5, 0.1, '{"2": 0.85, "3": 1.0, "4": 1.2, "5": 1.4}', '{"apartment": 1.0, "penthouse": 1.3, "house": 1.6}'),
    ('Central', 4900, -2.9, 8.4, 28.0, -0.1, '{"2": 0.75, "3": 1.0, "4": 1.2, "5": 1.45}', '{"apartment": 1.0, "penthouse": 1.35, "house": 1.7}'),
    ('North', 3500, 5.4, 10.5, 22.0, 0.4, '{"2": 0.8, "3": 1.0, "4": 1.2, "5": 1.4}', '{"apartment": 1.0, "penthouse": 1.2, "house": 1.5}'),
    ('South', 3600, 1.2, 4.5, 18.0, 0.2, '{"2": 0.8, "3": 1.0, "4": 1.2, "5": 1.4}', '{"apartment": 1.0, "penthouse": 1.2, "house": 1.5}')
ON CONFLICT (region_name) DO UPDATE SET 
    avg_rent = EXCLUDED.avg_rent,
    growth_1y = EXCLUDED.growth_1y,
    growth_2y = EXCLUDED.growth_2y,
    growth_5y = EXCLUDED.growth_5y,
    month_over_month = EXCLUDED.month_over_month,
    room_adjustments = EXCLUDED.room_adjustments,
    type_adjustments = EXCLUDED.type_adjustments,
    updated_at = NOW();
