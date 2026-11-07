-- Run in a NEW, dedicated Supabase project as the project administrator.
-- This migration intentionally does not grant anyone ownership.
begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table private.space_owner (
  singleton boolean primary key default true check (singleton),
  user_id uuid not null unique references auth.users(id) on delete cascade
);
revoke all on private.space_owner from public, anon, authenticated;
alter table private.space_owner enable row level security;
alter table private.space_owner force row level security;
-- The privileged lookup stays outside the exposed API schema.
create function private.space_is_owner() returns boolean
language sql stable security definer set search_path = ''
as $$ select (select auth.uid()) is not null and exists
  (select 1 from private.space_owner where user_id = (select auth.uid())); $$;
revoke all on function private.space_is_owner() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.space_is_owner() to authenticated;
-- A non-privileged, boolean-only RPC for the login screen.
create function public.space_is_owner() returns boolean
language sql stable security invoker set search_path = ''
as $$ select private.space_is_owner(); $$;
revoke all on function public.space_is_owner() from public, anon;
grant execute on function public.space_is_owner() to authenticated;
create table public.learning_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 160),
  category text not null check (length(category) between 1 and 80),
  target_date date,
  status text not null default 'active' check (status in ('active','done')),
  created_at timestamptz not null default now()
);
create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null check (length(trim(subject)) between 1 and 160),
  date date not null,
  minutes integer not null check (minutes between 1 and 1440),
  note text not null default '' check (length(note) <= 2000),
  created_at timestamptz not null default now()
);
create table public.finance_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  type text not null check (type in ('income','expense')),
  amount numeric(11,2) not null check (amount > 0),
  currency text not null check (currency in ('EUR','CNY','USD')),
  category text not null check (length(trim(category)) between 1 and 80),
  note text not null default '' check (length(note) <= 500),
  created_at timestamptz not null default now()
);
create table public.monthly_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null check (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  currency text not null check (currency in ('EUR','CNY','USD')),
  amount numeric(11,2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  unique (user_id, month, currency)
);
-- Supabase's optional auto-RLS event trigger is admin-only, never a public RPC.
do $$ begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;
-- Grant only reading/creating/updating records. No browser delete privileges.
do $$ declare t text; begin
  foreach t in array array['learning_goals','study_sessions','finance_entries','monthly_budgets'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('alter table public.%I force row level security',t);
    execute format('revoke all on public.%I from public, anon, authenticated',t);
    execute format('grant select, insert, update on public.%I to authenticated',t);
    execute format('create policy owner_select on public.%I for select to authenticated using ((select private.space_is_owner()) and user_id = (select auth.uid()))',t);
    execute format('create policy owner_insert on public.%I for insert to authenticated with check ((select private.space_is_owner()) and user_id = (select auth.uid()))',t);
    execute format('create policy owner_update on public.%I for update to authenticated using ((select private.space_is_owner()) and user_id = (select auth.uid())) with check ((select private.space_is_owner()) and user_id = (select auth.uid()))',t);
    execute format('create index on public.%I (user_id, created_at desc, id desc)',t);
  end loop;
end $$;
commit;
