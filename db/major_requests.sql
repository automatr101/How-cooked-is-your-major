-- Majors visitors searched for that the site does not have yet ("score my major"). Applied to the live database 2026-10-17.
-- Server-only, like the other tables: Row Level Security on, no policies, nothing granted to the public roles.
-- The email is optional and kept only so the visitor can be told once the major is added; deleted on request.
create table if not exists public.major_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  query text not null check (char_length(query) between 2 and 60),
  email text check (email is null or (char_length(email) between 5 and 120 and email = lower(email))),
  country text check (country is null or char_length(country) = 2),
  notified_at timestamptz
);
create index if not exists major_requests_query_idx on public.major_requests (lower(query));
alter table public.major_requests enable row level security;
revoke all on public.major_requests from anon, authenticated;
