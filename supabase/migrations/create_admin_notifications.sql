-- Create admin_notifications table
create table if not exists admin_notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  type text not null check (type in ('upgrade_request', 'system_alert')),
  content jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'processing', 'resolved', 'dismissed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table admin_notifications enable row level security;

-- Policy: Admins can view all notifications
create policy "Admins can view all notifications"
  on admin_notifications for select
  to authenticated
  using (
    exists (
      select 1 from user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Policy: Admins can update notifications
create policy "Admins can update notifications"
  on admin_notifications for update
  to authenticated
  using (
    exists (
      select 1 from user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Policy: Users can insert their own upgrade requests
create policy "Users can insert upgrade requests"
  on admin_notifications for insert
  to authenticated
  with check (
    user_id = auth.uid() 
    and type = 'upgrade_request'
  );

-- Optional: Index for filtering by status
create index if not exists idx_admin_notifications_status on admin_notifications(status);
