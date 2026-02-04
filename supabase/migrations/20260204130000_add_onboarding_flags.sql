-- Add onboarding tracking flag
alter table public.user_preferences 
add column if not exists has_seen_welcome_v1 boolean default false;

-- Comment for documentation
comment on column public.user_preferences.has_seen_welcome_v1 is 'Tracks if the user has seen the Bionic Welcome Overlay (v1)';
