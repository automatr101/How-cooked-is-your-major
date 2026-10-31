-- Finished daily games, one row per finished game, for the owner's Telegram digest (src/lib/games/digest.ts).
-- Same security model as `game_scores`: Row Level Security on, no public policies, nothing granted to the public roles.
-- Only the server (secret service key) reads or writes it. There is no player id, IP or anything else about the person:
-- just which game, which UTC puzzle day and the short result code ("3", "fail", "7", "win-hard", "vote").

create table if not exists public.game_plays (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  day integer not null check (day > 0),
  game text not null check (game in ('wordle', 'cooked-or-cap', 'major-wars', 'tic-tac-toe')),
  result text not null check (char_length(result) between 1 and 16)
);

create index if not exists game_plays_day_idx on public.game_plays (day, game);

alter table public.game_plays enable row level security;
revoke all on public.game_plays from anon, authenticated;
