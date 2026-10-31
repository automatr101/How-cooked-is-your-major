// SERVER ONLY. The owner's daily games digest for Telegram: what happened on one UTC puzzle day.
// Private to the owner's chat, so it can show raw counts (nothing here is ever shown on the site).

import { escapeHtml } from "@/lib/telegram";
import { dayStart } from "./daily";
import { matchup, scanPick } from "./major-wars";
import { playsForDay, type PlayRow } from "./plays";
import { board, type Game } from "./scores";
import { counts } from "./votes";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const avg = (nums: number[]) => (nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1) : "-");

function topLine(entries: { nickname: string; score: number }[], unit: string): string {
  return entries
    .slice(0, 3)
    .map((e) => `${escapeHtml(e.nickname)} (${e.score}${unit})`)
    .join(", ");
}

async function safe<T>(job: () => Promise<T>): Promise<T | null> {
  try {
    return await job();
  } catch {
    return null; // one table being down must not lose the rest of the digest
  }
}

export async function buildDigest(day: number): Promise<string> {
  const date = dayStart(day).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  const lines = [`🎮 <b>Games, #${day} (${date})</b>`];

  const plays: PlayRow[] | null = await safe(() => playsForDay(day));
  const of = (game: PlayRow["game"]) => (plays ?? []).filter((p) => p.game === game);

  if (plays === null) {
    lines.push("Plays: could not read the tally.");
  } else {
    const wordle = of("wordle");
    const solved = wordle.filter((p) => p.result !== "fail");
    lines.push(`Major Wordle: ${plural(wordle.length, "game")}${wordle.length ? `, ${solved.length} solved, avg ${avg(solved.map((p) => Number(p.result)))} tries` : ""}`);

    const quiz = of("cooked-or-cap");
    lines.push(`Cooked or Cap?: ${plural(quiz.length, "game")}${quiz.length ? `, avg ${avg(quiz.map((p) => Number(p.result)))}/10` : ""}`);

    const ttt = of("tic-tac-toe");
    const n = (prefix: string) => ttt.filter((p) => p.result.startsWith(prefix)).length;
    lines.push(`Tic-Tac-Toe vs AI: ${plural(ttt.length, "game")}${ttt.length ? ` (${n("win")} player wins, ${n("loss")} AI wins, ${n("draw")} draws)` : ""}`);
  }

  const pair = matchup(day);
  const votes = await safe(() => counts(day));
  if (votes === null) {
    lines.push("Major Wars: could not read the votes.");
  } else {
    const total = votes[0] + votes[1];
    const pct = (i: 0 | 1) => (total ? Math.round((votes[i] / total) * 100) : 0);
    lines.push(
      `Major Wars: ${plural(total, "vote")}. ${escapeHtml(pair[0].name)} ${votes[0]} (${pct(0)}%), ${escapeHtml(pair[1].name)} ${votes[1]} (${pct(1)}%). Scan says ${escapeHtml(pair[scanPick(pair)].name)} is more cooked.`
    );
  }

  for (const [game, name, unit] of [["wordle", "Wordle", " tries"], ["cooked-or-cap", "Cooked or Cap?", "/10"]] as [Game, string, string][]) {
    const b = await safe(() => board(game, day, null));
    if (b && b.total > 0) lines.push(`${name} board (${b.total} posted): ${topLine(b.top, unit)}`);
  }

  return lines.join("\n");
}
