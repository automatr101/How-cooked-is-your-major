-- Online Tic-Tac-Toe rooms ("play a friend"). Same security model as game_scores: Row Level Security on, no public
-- policies, only the server (secret service key) reads or writes. The server holds the rules: every move is checked there.
--
-- A room is made by one player (seat X), joined by a second with the code or link (seat O). Each seat has a random secret
-- token kept in that browser; the tokens are never returned to the other player. Boards are 9 characters: X, O or - (empty).
-- Rooms are throwaway: the server deletes the ones not touched for a day.

create table if not exists public.ttt_rooms (
  code text primary key check (code ~ '^[A-Z0-9]{5}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  board text not null default '---------' check (board ~ '^[XO-]{9}$'),
  turn text not null default 'X' check (turn in ('X', 'O')),
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'won', 'draw')),
  winner text check (winner in ('X', 'O')),
  round integer not null default 0,
  x_token text not null,
  o_token text
);

create index if not exists ttt_rooms_updated_idx on public.ttt_rooms (updated_at);

alter table public.ttt_rooms enable row level security;
revoke all on public.ttt_rooms from anon, authenticated;
