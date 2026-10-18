-- The campus ambassador program: students who share their own link and earn a cut of every plan bought through it.
-- Same security model as `purchases`, `reviews` and `leads`: Row Level Security on, no public policies, nothing granted to
-- the public roles. Only the server (with the secret service key) can read or write these tables.
--
-- The money is paid out by hand by the owner (mobile money or similar, arranged by email). No payout details are stored here.

create table if not exists public.ambassadors (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  code text not null unique check (code ~ '^[a-z0-9-]{4,24}$'),     -- the ?ref= in their link
  name text not null check (char_length(name) between 2 and 60),
  email text not null unique check (char_length(email) between 5 and 120 and email = lower(email)),
  email_hash text,                                                   -- same keyed fingerprint purchases use, to refuse self-referrals
  campus text not null check (char_length(campus) between 2 and 80),
  status text not null default 'active' check (status in ('active', 'paused')),
  clicks integer not null default 0,
  consent_at timestamptz not null default now()
);

-- One row per checkout started through an ambassador's link. It becomes 'paid' when the payment is verified; whether it was
-- refunded later is read from `purchases` (same reference), so a refund cancels the commission without extra bookkeeping.
create table if not exists public.referrals (
  reference text primary key,
  created_at timestamptz not null default now(),
  code text not null references public.ambassadors (code) on update cascade,
  status text not null default 'started' check (status in ('started', 'paid')),
  amount_minor integer,
  currency text check (currency is null or char_length(currency) = 3),
  commission_minor integer,                                          -- fixed at the rate in force when the sale happened
  paid_at timestamptz,
  payout_at timestamptz                                              -- set when the owner marks the commission as paid out
);

create index if not exists referrals_code_idx on public.referrals (code);

-- One atomic +1 per counted visit (the server rate-limits them per visitor first)
create or replace function public.ambassador_click(p_code text) returns boolean
language sql
set search_path = public
as $$
  update public.ambassadors set clicks = clicks + 1 where code = p_code and status = 'active' returning true;
$$;

alter table public.ambassadors enable row level security;
alter table public.referrals enable row level security;
revoke all on public.ambassadors from anon, authenticated;
revoke all on public.referrals from anon, authenticated;
revoke all on function public.ambassador_click(text) from public, anon, authenticated;
grant execute on function public.ambassador_click(text) to service_role;
