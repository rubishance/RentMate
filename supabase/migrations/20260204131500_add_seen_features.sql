-- Add seen_features tracking array
alter table public.user_preferences 
add column if not exists seen_features text[] default '{}';

-- Comment for documentation
comment on column public.user_preferences.seen_features is 'Array of feature IDs that the user has seen/dismissed (e.g. "dashboard_add_property")';
