-- Major Wars daily votes. Same security model as `game_scores`: Row Level Security on, no public policies, nothing granted to the
-- public roles. Only the server (secret service key) reads or writes it.
--
-- One row per player per day. player_id is a random id the browser made up and keeps in localStorage; it is never returned
-- by any API, and there are no accounts, emails or IPs here. choice 0 / 1 is the first / second major of that day's matchup
-- (see src/lib/games/major-wars.ts). The API only ever returns percentages, and only once enough people have voted.

create table if not exists public.major_votes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  day integer not null check (day > 0),
  player_id text not null check (char_length(player_id) between 16 and 64),
  choice smallint not null check (choice in (0, 1)),
  unique (day, player_id)
);

create index if not exists major_votes_day_idx on public.major_votes (day, choice);

alter table public.major_votes enable row level security;
revoke all on public.major_votes from anon, authenticated;
