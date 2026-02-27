-- Create waitlist table
create table public.waitlist (
    id uuid default gen_random_uuid() primary key,
    full_name text not null,
    email text not null unique,
    phone text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.waitlist enable row level security;

-- Policy to allow anonymous/authenticated users to insert into waitlist
create policy "Anyone can insert into waitlist"
    on public.waitlist for insert
    with check (true);

-- No SELECT policy needed for now since the Supabase Dashboard (postgres role) bypasses RLS
-- and there is no in-app admin dashboard yet.
