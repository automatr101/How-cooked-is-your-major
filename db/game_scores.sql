-- Daily game leaderboards (Major Wordle and Cooked or Cap?). Same security model as `reviews` and `purchases`:
-- Row Level Security on, no public policies, nothing granted to the public roles. Only the server (secret service key) reads or writes it.
--
-- One row per player per game per day. player_id is a random id the browser made up and keeps in localStorage; it is never
-- returned by any API, and there are no accounts, emails or IPs here. The server re-checks every score from the answers
-- the browser sends (see src/lib/games/scores.ts), so a number cannot simply be typed in.
--   wordle          score = number of guesses (1-6, lower is better); only solved puzzles are posted
--   cooked-or-cap   score = correct answers (0-10, higher is better)
-- To remove a bad nickname: delete from public.game_scores where id = '...';

create table if not exists public.game_scores (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  game text not null check (game in ('wordle', 'cooked-or-cap')),
  day integer not null check (day > 0),
  player_id text not null check (char_length(player_id) between 16 and 64),
  nickname text not null check (char_length(nickname) between 2 and 16),
  score smallint not null check (score between 0 and 10),
  unique (game, day, player_id)
);

create index if not exists game_scores_board_idx on public.game_scores (game, day, score, created_at);

alter table public.game_scores enable row level security;
revoke all on public.game_scores from anon, authenticated;
