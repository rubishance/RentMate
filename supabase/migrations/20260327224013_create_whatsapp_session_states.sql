create table if not exists public.whatsapp_session_states (
  phone_number text primary key,
  current_intent text default 'none',
  pending_payload jsonb default '{}'::jsonb,
  status text default 'idle',
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.whatsapp_session_states enable row level security;

-- No access for anon/authenticated roles; we only want Edge Functions with Service Role to modify this.
create policy "Only service role can modify session states" 
on public.whatsapp_session_states 
for all 
using (false);
