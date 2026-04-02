// ═══════════════════════════════════════════════
// 🔊 Sound Reaction System — sounds.ts
// All sound logic lives here. Clean & modular.
// ═══════════════════════════════════════════════

let currentAudio: HTMLAudioElement | null = null;
let isMuted = false;

// ── Mute controls ──────────────────────────────
export const toggleMute = () => {
  isMuted = !isMuted;
  if (isMuted && currentAudio) {
    currentAudio.pause();
  }
  return isMuted;
};

export const getIsMuted = () => isMuted;

// ── Core playback (stops previous sound first) ─
function playSound(src: string) {
  if (isMuted) return;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }
  currentAudio = new Audio(src);
  currentAudio.play().catch(() => {});
}

// ── Vibrate helper ─────────────────────────────
function vibrate(pattern: number | number[]) {
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch {}
}

// ═══════════════════════════════════════════════
// RESULT SOUNDS (after scan completes)
//   safe/mid (score ≤ 60)  → crowd-clap
//   slightly cooked (61-80) → prowler-meme
//   very cooked (> 80)      → shotgun-fahh
// ═══════════════════════════════════════════════
export const playResultSound = (score: number) => {
  if (score <= 60) {
    playSound("/sounds/crowd-clap.mp3");
    vibrate([50, 50, 50]);
  } else if (score <= 80) {
    playSound("/sounds/prowler-meme.wav");
    vibrate([100, 50, 100]);
  } else {
    playSound("/sounds/shotgun-fahh.mp3");
    vibrate([200, 100, 200, 100, 400]);
  }
};

// ═══════════════════════════════════════════════
// PAGE SOUNDS
// ═══════════════════════════════════════════════

/** Plays when site first loads (Discord join chime) */
export const playSiteLoadSound = () => {
  playSound("/sounds/discord-join.mp3");
};

/** Plays when the leaderboard page opens (Among Us dead body) */
export const playLeaderboardSound = () => {
  playSound("/sounds/among-us-dead.mp3");
};

/** Plays when the compare page opens (Among Us role reveal) */
export const playCompareSound = () => {
  playSound("/sounds/among-us-role.mp3");
};

/** Plays when user returns to the tab (Discord notification — retention boost) */
export const playReturnSound = () => {
  playSound("/sounds/discord-notification.mp3");
};

// ═══════════════════════════════════════════════
// REPLAY (re-plays the last sound that was triggered)
// ═══════════════════════════════════════════════
export const replayLastSound = () => {
  if (currentAudio && !isMuted) {
    currentAudio.currentTime = 0;
    currentAudio.play().catch(() => {});
  }
};

// ═══════════════════════════════════════════════
// REACTION CLASS (visual effect on the card)
//   ultra cooked → shake
//   cooked       → red flash
//   safe/mid     → green glow
// ═══════════════════════════════════════════════
export function getReactionClass(score: number): string {
  if (score > 80) return "reaction-ultra-cooked";
  if (score > 60) return "reaction-cooked";
  if (score <= 40) return "reaction-safe";
  return "";
}
