-- MeHealth: accounts, cloud sync and subscription status.
-- Run this once in the Supabase SQL editor (or with `supabase db push`).

-- One row per member. Created automatically when someone signs up.
-- Members can READ their own row but never write it: subscription fields are
-- only changed by the Stripe webhook using the server-side secret key, so a
-- member can't grant themselves access from the browser.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  stripe_customer_id text unique,
  stripe_subscription_id text,
  subscription_status text not null default 'none',
  trial_end timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Members read own profile" on public.profiles;
create policy "Members read own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- The member's 12-week program state (checklist, fasting window, measurements,
-- journal, history). Stored as one JSON document so the app shape can evolve.
create table if not exists public.app_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

drop policy if exists "Members read own state" on public.app_state;
create policy "Members read own state"
  on public.app_state for select
  using (auth.uid() = user_id);

drop policy if exists "Members insert own state" on public.app_state;
create policy "Members insert own state"
  on public.app_state for insert
  with check (auth.uid() = user_id);

drop policy if exists "Members update own state" on public.app_state;
create policy "Members update own state"
  on public.app_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
