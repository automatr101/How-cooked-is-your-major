// Which meme sound plays for which result. Pure data and one pure function, so it is easy to tune
// and to test (see `npm run sound:check`).
//
// A scan picks a sound at random from the pool for its cooked level, skipping the last couple that
// played, so pressing through majors doesn't give the same sound twice in a row. A pool with one
// sound simply repeats it.
//
// The mapping below is a first guess from the file names. Change a pool here and nothing else needs
// to change. Every name is a file in public/sounds/<name>.mp3.
//
// Processing notes for the six sounds added on 2026-10-03 (the raw files are the ones in Downloads):
//   - silence at the start removed (each starts within ~30 ms, which is the MP3 encoder's own delay)
//   - loudest moment of each set to about -13 dB and peaks kept under -1.5 dB, so no sound is louder
//     than another (they ranged from -6 dB to -26 dB before)
//   - ended at a natural pause with a fade: oh-my-god-bro-oh-hell-nah-man 10.8s -> 4.8s (cut at the
//     pause after the loud burst), atassa 6.3s -> 5.0s, chicken-on-tree-screaming 5.7s -> 4.9s,
//     undertakers-bell 4.2s -> 3.6s, fahhh 2.3s -> 1.9s, vine-boom unchanged at ~1.2s
//   - atassa and vine-boom are mono (their two channels were identical), the rest stay stereo

export type SoundTier = "low" | "mid" | "high" | "extreme";

/** Same bands as the roast tiers: 0-40, 41-60, 61-80, 81-100. */
export function soundTierOf(score: number): SoundTier {
  if (score <= 40) return "low";
  if (score <= 60) return "mid";
  if (score <= 80) return "high";
  return "extreme";
}

export const RESULT_SOUNDS: Record<SoundTier, string[]> = {
  low: ["crowd-clap"],
  mid: ["crowd-clap", "vine-boom", "atassa"],
  high: ["fahhh", "atassa", "vine-boom", "chicken-on-tree-screaming"],
  extreme: ["oh-my-god-bro-oh-hell-nah-man", "undertakers-bell", "chicken-on-tree-screaming", "shotgun-fahh", "vine-boom"],
};

export const soundUrl = (name: string) => `/sounds/${name}.mp3`;

/** How many of the most recent picks are skipped when there is a choice. */
const AVOID_RECENT = 2;

/**
 * Picks a sound for a score. `recent` is the list of names played so far, newest first.
 * Prefers a sound that isn't among the last two; if the pool is too small for that, at least
 * avoids the one just played; a one-sound pool just returns that sound.
 */
export function pickResultSound(score: number, recent: string[], rng: () => number = Math.random): string {
  const pool = RESULT_SOUNDS[soundTierOf(score)];
  let options = pool.filter((n) => !recent.slice(0, AVOID_RECENT).includes(n));
  if (options.length === 0) options = pool.filter((n) => n !== recent[0]);
  if (options.length === 0) options = pool;
  return options[Math.floor(rng() * options.length)];
}
