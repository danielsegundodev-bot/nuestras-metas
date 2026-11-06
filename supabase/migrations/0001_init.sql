-- Nuestras Metas — initial schema.
-- Safe to run more than once in the Supabase SQL editor (idempotent where practical).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.allowed_emails (
  email text primary key
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  currency text not null default 'MXN' check (currency in ('MXN', 'USD')),
  color text,
  created_at timestamptz not null default now()
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  emoji text not null default '',
  target_mxn numeric(14, 2) not null check (target_mxn >= 0),
  target_date date,
  color text not null,
  sort int not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- positive = deposit, negative = withdrawal
  amount numeric(14, 2) not null check (amount <> 0),
  currency text not null check (currency in ('MXN', 'USD')),
  -- USD->MXN rate at time of entry; stored so history never changes retroactively
  fx_usd_mxn numeric(10, 4) not null check (fx_usd_mxn > 0),
  amount_mxn numeric(14, 2) generated always as (
    case when currency = 'USD' then amount * fx_usd_mxn else amount end
  ) stored,
  date date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists contributions_goal_id_date_idx on public.contributions (goal_id, date);
create index if not exists contributions_date_idx on public.contributions (date);

create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  move_date date,
  return_date date
);

-- ---------------------------------------------------------------------------
-- Access helper
-- ---------------------------------------------------------------------------

create or replace function public.is_allowed()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.allowed_emails a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.is_allowed() from public;
grant execute on function public.is_allowed() to authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.allowed_emails enable row level security;
alter table public.profiles enable row level security;
alter table public.goals enable row level security;
alter table public.contributions enable row level security;
alter table public.settings enable row level security;

-- allowed_emails: readable by allowed users only; managed by hand in the SQL editor.
drop policy if exists allowed_emails_select on public.allowed_emails;
create policy allowed_emails_select on public.allowed_emails
  for select to authenticated using (public.is_allowed());

-- profiles: allowed users see both profiles; each person edits only their own.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (public.is_allowed());
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated with check (public.is_allowed() and user_id = auth.uid());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (public.is_allowed() and user_id = auth.uid())
  with check (public.is_allowed() and user_id = auth.uid());

-- goals: shared, fully editable by allowed users.
drop policy if exists goals_select on public.goals;
create policy goals_select on public.goals
  for select to authenticated using (public.is_allowed());
drop policy if exists goals_insert on public.goals;
create policy goals_insert on public.goals
  for insert to authenticated with check (public.is_allowed());
drop policy if exists goals_update on public.goals;
create policy goals_update on public.goals
  for update to authenticated using (public.is_allowed()) with check (public.is_allowed());
drop policy if exists goals_delete on public.goals;
create policy goals_delete on public.goals
  for delete to authenticated using (public.is_allowed());

-- contributions: everyone allowed reads and adds; only the owner edits/deletes.
drop policy if exists contributions_select on public.contributions;
create policy contributions_select on public.contributions
  for select to authenticated using (public.is_allowed());
drop policy if exists contributions_insert on public.contributions;
create policy contributions_insert on public.contributions
  for insert to authenticated with check (public.is_allowed() and user_id = auth.uid());
drop policy if exists contributions_update on public.contributions;
create policy contributions_update on public.contributions
  for update to authenticated
  using (public.is_allowed() and user_id = auth.uid())
  with check (public.is_allowed() and user_id = auth.uid());
drop policy if exists contributions_delete on public.contributions;
create policy contributions_delete on public.contributions
  for delete to authenticated using (public.is_allowed() and user_id = auth.uid());

-- settings: single shared row.
drop policy if exists settings_select on public.settings;
create policy settings_select on public.settings
  for select to authenticated using (public.is_allowed());
drop policy if exists settings_update on public.settings;
create policy settings_update on public.settings
  for update to authenticated using (public.is_allowed()) with check (public.is_allowed());

-- ---------------------------------------------------------------------------
-- Auto-create a profile for every new auth user
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name, currency, color)
  values (new.id, split_part(coalesce(new.email, ''), '@', 1), 'MXN', null)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Seed (idempotent)
-- ---------------------------------------------------------------------------

insert into public.settings (id, move_date, return_date)
values (1, null, null)
on conflict (id) do nothing;

insert into public.goals (id, name, emoji, target_mxn, color, sort)
values
  ('00000000-0000-4000-8000-000000000001', 'Casa', '🏡', 800000, '#34C759', 0),
  ('00000000-0000-4000-8000-000000000002', 'Boda', '💍', 300000, '#FF9500', 1),
  ('00000000-0000-4000-8000-000000000003', 'Diciembres juntos', '✈️', 300000, '#30B0C7', 2),
  ('00000000-0000-4000-8000-000000000004', 'Fondo de emergencia', '🛟', 150000, '#AF52DE', 3),
  ('00000000-0000-4000-8000-000000000005', 'Nuestro hogar', '🛋️', 120000, '#FFCC00', 4)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'contributions'
  ) then
    alter publication supabase_realtime add table public.contributions;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'goals'
  ) then
    alter publication supabase_realtime add table public.goals;
  end if;
end;
$$;
