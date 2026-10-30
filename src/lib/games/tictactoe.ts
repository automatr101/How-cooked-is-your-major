// Tic-Tac-Toe rules and the computer player. A board is 9 cells, each "X", "O" or null; cells are numbered 0-8 left to right, top to bottom.

export type Cell = "X" | "O" | null;
export type Board = Cell[];

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export function winner(b: Board): { who: "X" | "O"; line: number[] } | null {
  for (const line of LINES) {
    const [a, c, d] = line;
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return { who: b[a] as "X" | "O", line };
  }
  return null;
}

export const isFull = (b: Board) => b.every(Boolean);
const empty = (b: Board) => b.flatMap((c, i) => (c ? [] : [i]));

// Minimax: +1 if `me` wins, -1 if the other side wins, 0 for a draw. Fewer moves to a win is better, so it wins fast and loses slow.
function score(b: Board, turn: "X" | "O", me: "X" | "O", depth: number): number {
  const w = winner(b);
  if (w) return (w.who === me ? 10 : -10) + (w.who === me ? -depth : depth);
  if (isFull(b)) return 0;
  const next = turn === "X" ? "O" : "X";
  const scores = empty(b).map((i) => {
    const copy = b.slice();
    copy[i] = turn;
    return score(copy, next, me, depth + 1);
  });
  return turn === me ? Math.max(...scores) : Math.min(...scores);
}

/** Best move for `me` (never loses). Ties are broken at random so games differ. */
export function bestMove(b: Board, me: "X" | "O", rand: () => number = Math.random): number {
  const other = me === "X" ? "O" : "X";
  const options = empty(b).map((i) => {
    const copy = b.slice();
    copy[i] = me;
    return { i, s: score(copy, other, me, 1) };
  });
  const top = Math.max(...options.map((o) => o.s));
  const best = options.filter((o) => o.s === top);
  return best[Math.floor(rand() * best.length)].i;
}

/** Easy: the best move one time in three, a random square otherwise. It can be beaten but is not a pushover. */
export function easyMove(b: Board, me: "X" | "O", rand: () => number = Math.random): number {
  if (rand() < 1 / 3) return bestMove(b, me, rand);
  const free = empty(b);
  return free[Math.floor(rand() * free.length)];
}
