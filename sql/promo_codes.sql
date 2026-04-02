-- Run once in Supabase SQL editor (or via migration pipeline)

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  percent_off int not null check (percent_off >= 1 and percent_off <= 100),
  max_uses int,
  used_count int not null default 0,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  promo_id uuid not null references public.promo_codes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_type text not null,
  razorpay_payment_id text unique,
  created_at timestamptz not null default now(),
  unique (promo_id, user_id)
);

create index if not exists idx_promo_codes_code on public.promo_codes (upper(code));

alter table public.promo_codes enable row level security;
alter table public.promo_redemptions enable row level security;
-- No policies: anon/authenticated cannot access; backend service role bypasses RLS.
