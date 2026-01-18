-- Create saved_calculations table
create table if not exists public.saved_calculations (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    user_id uuid references auth.users(id) on delete set null,
    input_data jsonb not null,
    result_data jsonb not null
);

-- RLS Policies
alter table public.saved_calculations enable row level security;

-- Allow public read access (so anyone with the link can view)
create policy "Allow public read access"
    on public.saved_calculations for select
    using (true);

-- Allow authenticated users to insert their own calculations
create policy "Allow authenticated insert"
    on public.saved_calculations for insert
    with check (auth.uid() = user_id);

-- Add indexes for faster lookups if needed (though UUID lookup is fast)
create index if not exists saved_calculations_id_idx on public.saved_calculations(id);
