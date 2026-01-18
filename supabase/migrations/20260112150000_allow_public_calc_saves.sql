-- Update RLS policies for saved_calculations to allow public/anonymous inserts

-- Drop the restrictive policy
drop policy if exists "Allow authenticated insert" on public.saved_calculations;

-- Create a new inclusive policy
-- Allows insertion if:
-- 1. The user is authenticated and the user_id matches their UID
-- 2. The user is anonymous (or authenticated) and provides no user_id (NULL)
create policy "Allow public insert"
    on public.saved_calculations for insert
    with check (
        (auth.uid() = user_id) OR (user_id is null)
    );
