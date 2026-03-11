create extension if not exists pgcrypto;

create table if not exists public.drops (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  user_name text,
  user_role text,
  user_avatar_url text,
  title text not null,
  description text not null,
  badge_label text,
  badge_color text,
  image_url text,
  start_date date,
  end_date date,
  location text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists drops_status_idx on public.drops (status);
create index if not exists drops_created_at_idx on public.drops (created_at desc);
create index if not exists drops_user_id_idx on public.drops (user_id);

alter table public.drops enable row level security;

-- Public can read approved drops.
drop policy if exists "Public can read approved drops" on public.drops;
create policy "Public can read approved drops"
on public.drops
for select
to anon, authenticated
using (status = 'approved');

-- Authenticated users can read their own drops (including pending/rejected).
drop policy if exists "Users can read own drops" on public.drops;
create policy "Users can read own drops"
on public.drops
for select
to authenticated
using (auth.uid() = user_id);

-- Users can insert their own drops.
drop policy if exists "Users can insert own drops" on public.drops;
create policy "Users can insert own drops"
on public.drops
for insert
to authenticated
with check (auth.uid() = user_id);

-- Admins can read and update all drops.
drop policy if exists "Admins can read all drops" on public.drops;
create policy "Admins can read all drops"
on public.drops
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can update all drops" on public.drops;
create policy "Admins can update all drops"
on public.drops
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());
