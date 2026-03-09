-- Role requests submitted from the app (More -> Request role).
create table if not exists public.role_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text,
  current_role text not null,
  requested_role text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists role_requests_user_id_idx on public.role_requests (user_id);
create index if not exists role_requests_status_idx on public.role_requests (status);
create index if not exists role_requests_created_at_idx on public.role_requests (created_at desc);

alter table public.role_requests enable row level security;

-- Users can create role requests for themselves.
create policy "Users can insert own role requests"
on public.role_requests
for insert
to authenticated
with check (auth.uid() = user_id);

-- Users can view their own role requests.
create policy "Users can read own role requests"
on public.role_requests
for select
to authenticated
using (auth.uid() = user_id);
