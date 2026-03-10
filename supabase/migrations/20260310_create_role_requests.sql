create extension if not exists pgcrypto;

create table if not exists public.role_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text,
  "current_role" text not null,
  requested_role text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

-- Backfill missing columns if the table was created earlier without them.
alter table public.role_requests add column if not exists id uuid;
alter table public.role_requests alter column id set default gen_random_uuid();
alter table public.role_requests add column if not exists status text default 'pending';
alter table public.role_requests add column if not exists created_at timestamptz default now();
alter table public.role_requests add column if not exists "current_role" text;
alter table public.role_requests add column if not exists requested_role text;

-- Create a default role_request row for each new auth user.
create or replace function public.handle_new_auth_user_role_request()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.role_requests (
    user_id,
    user_email,
    "current_role",
    requested_role
  )
  values (
    new.id,
    new.email,
    'Guest',
    'Guest'
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_role_request on auth.users;
create trigger on_auth_user_created_role_request
after insert on auth.users
for each row execute procedure public.handle_new_auth_user_role_request();

-- Normalize existing rows before enforcing one-row-per-user.
with ranked as (
  select id,
         row_number() over (partition by user_id order by created_at desc, id desc) as rn
  from public.role_requests
)
delete from public.role_requests rr
using ranked r
where rr.id = r.id
  and r.rn > 1;

-- Enforce one entry per user.
drop index if exists public.role_requests_user_id_idx;
create unique index if not exists role_requests_user_id_idx on public.role_requests (user_id);
create index if not exists role_requests_status_idx on public.role_requests (status);
create index if not exists role_requests_created_at_idx on public.role_requests (created_at desc);

-- On every new request, remove any previous requests from the same user/email.
create or replace function public.keep_latest_role_request()
returns trigger
language plpgsql
as $$
begin
  delete from public.role_requests
  where user_id = new.user_id
     or (
       new.user_email is not null
       and user_email is not null
       and lower(user_email) = lower(new.user_email)
     );

  return new;
end;
$$;

drop trigger if exists role_requests_keep_latest_before_insert on public.role_requests;
create trigger role_requests_keep_latest_before_insert
before insert on public.role_requests
for each row execute procedure public.keep_latest_role_request();

alter table public.role_requests enable row level security;

-- Helper to avoid RLS recursion when checking admin.
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  -- Bypass RLS inside this check (function owner must have bypassrls).
  perform set_config('row_security', 'off', true);
  return exists (
    select 1
    from public.role_requests rr
    where rr.user_id = auth.uid()
      and rr.current_role = 'Admin'
  );
end;
$$;

drop policy if exists "Users can insert own role requests" on public.role_requests;
create policy "Users can insert own role requests"
on public.role_requests
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can read own role requests" on public.role_requests;
create policy "Users can read own role requests"
on public.role_requests
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can delete own role requests" on public.role_requests;
create policy "Users can delete own role requests"
on public.role_requests
for delete
to authenticated
using (auth.uid() = user_id);

-- Admins can view and update any role request.
drop policy if exists "Admins can read all role requests" on public.role_requests;
create policy "Admins can read all role requests"
on public.role_requests
for select
to authenticated
using (
  public.is_admin()
);

drop policy if exists "Admins can update all role requests" on public.role_requests;
create policy "Admins can update all role requests"
on public.role_requests
for update
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);
