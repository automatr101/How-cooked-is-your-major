// Which meme sound plays for which result. Pure data and one pure function, so it is easy to tune
// and to test (see `npm run sound:check`).
//
// A scan picks a sound at random from the pool for its cooked level, skipping the last couple that
// played, so pressing through majors doesn't give the same sound twice in a row. A pool with one
// sound simply repeats it.
//
// The owner's set of 2026-10-24 (raw files in Downloads/sounds): shakhed and app are for green results, the rest for
// the cooked ones. And now and then a green result gets a cooked sound anyway, as a joke (TWIST_CHANCE).
// Every name is a file in public/sounds/<name>.mp3. Change a pool here and nothing else needs to change.
//
// Processing (same as before): silence at the start removed, anything longer than 5 s cut at 5 s with a 0.5 s fade
// (shakhed 17.6 s, app 23.1 s, jet2-holiday 11.7 s, bonba 12.9 s, laughter 20.9 s, baby-laughing 6.6 s,
// du-bist-gut-genug 7.3 s), all set to the same loudness (-16 LUFS, peaks under -1.5 dB), 128 kbps MP3.
// Left out of the owner's folder on purpose: two gay-joke clips, the Pornhub intro, the Andrew Tate clip and two
// gunshots (not for a site students share), the 10 kHz tone (painful), a duplicate rizz, and four 2-4 minute tracks.

export type SoundTier = "low" | "mid" | "high" | "extreme";

/** Same bands as the roast tiers: 0-40, 41-60, 61-80, 81-100. */
export function soundTierOf(score: number): SoundTier {
  if (score <= 40) return "low";
  if (score <= 60) return "mid";
  if (score <= 80) return "high";
  return "extreme";
}

export const RESULT_SOUNDS: Record<SoundTier, string[]> = {
  low: ["shakhed", "app"],
  mid: ["ding", "rizz", "taco-bell-bong", "laura-normal", "suiii", "six-seven", "gogogo", "jet2-holiday", "baby-laughing", "du-bist-gut-genug", "laughter"],
  high: ["bruh", "fahhh", "fahhhhh", "metal-pipe-clang", "spongebob-fail", "bone-crack", "tuco-get-out", "error", "bonba"],
  extreme: ["sad-violin", "eagle-scream", "metal-pipe-clang", "spongebob-fail", "bonba", "fart", "bruh", "fahhhhh"],
};

/** How often a green (low) result plays a cooked sound instead, for the joke. */
export const TWIST_CHANCE = 0.2;
const TWIST_POOL = [...new Set([...RESULT_SOUNDS.high, ...RESULT_SOUNDS.extreme])];

export const soundUrl = (name: string) => `/sounds/${name}.mp3`;

/** How many of the most recent picks are skipped when there is a choice. */
const AVOID_RECENT = 2;

/**
 * Picks a sound for a score. `recent` is the list of names played so far, newest first.
 * Prefers a sound that isn't among the last two; if the pool is too small for that, at least
 * avoids the one just played; a one-sound pool just returns that sound.
 */
export function pickResultSound(score: number, recent: string[], rng: () => number = Math.random): string {
  const tier = soundTierOf(score);
  // Plot twist: now and then "not cooked" still gets roasted by a cooked sound
  const pool = tier === "low" && rng() < TWIST_CHANCE ? TWIST_POOL : RESULT_SOUNDS[tier];
  let options = pool.filter((n) => !recent.slice(0, AVOID_RECENT).includes(n));
  if (options.length === 0) options = pool.filter((n) => n !== recent[0]);
  if (options.length === 0) options = pool;
  return options[Math.floor(rng() * options.length)];
}
