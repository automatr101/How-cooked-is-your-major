-- The leads table: people who typed their email to get the extended roast + report and agreed to 3 emails.
-- NOT applied to the live database until the owner says so.
-- Same security model as `purchases` and `reviews`: Row Level Security on, no public policies, nothing granted to the public
-- roles. Only the server (with the secret service key) can read or write it.
--
-- Unlike purchases (which keep only a fingerprint of the email), a lead keeps the real address, because it is what the
-- emails are sent to. It is kept only for people who ticked the consent box, and deleted on request.

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null check (char_length(email) between 5 and 120 and email = lower(email)),
  major_slug text not null,
  score smallint not null check (score between 0 and 100),
  ref text check (ref is null or char_length(ref) <= 40),     -- the ?ref= of the link they arrived by
  country text check (country is null or char_length(country) = 2),
  consent_at timestamptz not null default now(),
  unsubscribe_token text not null unique,
  unsubscribed_at timestamptz,
  day0_sent_at timestamptz,
  day1_sent_at timestamptz,
  day2_sent_at timestamptz
);

-- one lead per address (the server stores it lower-cased)
create unique index if not exists leads_one_per_email on public.leads (email);
create index if not exists leads_due_idx on public.leads (created_at) where unsubscribed_at is null;

-- Score-change alerts (2026-10-18): a separate, optional opt-in. alerted_score is the score we last told them about
-- (null = the score they signed up with), so each change is emailed once.
alter table public.leads add column if not exists score_alerts boolean not null default false;
alter table public.leads add column if not exists alerted_score smallint check (alerted_score is null or alerted_score between 0 and 100);
create index if not exists leads_score_alerts_idx on public.leads (major_slug) where score_alerts and unsubscribed_at is null;

alter table public.leads enable row level security;
revoke all on public.leads from anon, authenticated;
