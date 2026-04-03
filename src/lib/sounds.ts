// ═══════════════════════════════════════════════
// 🔊 Sound Reaction System — sounds.ts
// Mobile-first: handles iOS/Android autoplay restrictions
// ═══════════════════════════════════════════════

let isMuted = false;
let audioUnlocked = false;
let currentAudio: HTMLAudioElement | null = null;
let pendingAudio: HTMLAudioElement | null = null;

// AudioContext for bulletproof mobile unlock
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

// ── Unlock audio on first user gesture ─────────
// Call this from a click/touch handler to unlock
// mobile audio playback for all future sounds
export function unlockAudio() {
  if (audioUnlocked) return;
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    // Play a silent buffer to fully unlock
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);

    // Also unlock HTMLAudioElement path
    const silent = new Audio("data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAABhk1a4vAAAAAAAAAAAAAAAAAAAA==");
    silent.play().catch(() => {});

    audioUnlocked = true;
  } catch {}
}

// ── Mute controls ──────────────────────────────
export const toggleMute = () => {
  isMuted = !isMuted;
  if (isMuted && currentAudio) {
    currentAudio.pause();
  }
  return isMuted;
};

export const getIsMuted = () => isMuted;

// ── Core playback ──────────────────────────────
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
// PRE-LOAD for mobile: call during user gesture (click),
// then call playPending() after setTimeout
// ═══════════════════════════════════════════════
export function preloadResultSound(score: number) {
  let src = "";
  if (score <= 60) {
    src = "/sounds/crowd-clap.mp3";
  } else if (score <= 80) {
    src = "/sounds/prowler-meme.wav";
  } else {
    src = "/sounds/shotgun-fahh.mp3";
  }
  pendingAudio = new Audio(src);
  pendingAudio.load(); // Primes the audio during the gesture window
}

export function playPendingSound(score: number) {
  if (isMuted) return;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }
  if (pendingAudio) {
    currentAudio = pendingAudio;
    pendingAudio = null;
    currentAudio.play().catch(() => {});
  } else {
    // Fallback if preload wasn't called
    playResultSound(score);
  }
  // Vibration
  if (score > 80) vibrate([200, 100, 200, 100, 400]);
  else if (score > 60) vibrate([100, 50, 100]);
  else vibrate([50, 50, 50]);
}

// ═══════════════════════════════════════════════
// RESULT SOUNDS (direct play — works when called
// directly from a click handler with no delay)
// ═══════════════════════════════════════════════
export const playResultSound = (score: number) => {
  if (isMuted) return;
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

/** Discord join chime — site first loads (after audio unlock) */
export const playSiteLoadSound = () => playSound("/sounds/discord-join.mp3");

/** Among Us dead body — leaderboard page */
export const playLeaderboardSound = () => playSound("/sounds/among-us-dead.mp3");

/** Among Us role reveal — compare page */
export const playCompareSound = () => playSound("/sounds/among-us-role.mp3");

/** Discord notification — user returns to tab */
export const playReturnSound = () => playSound("/sounds/discord-notification.mp3");

// ═══════════════════════════════════════════════
// REPLAY
// ═══════════════════════════════════════════════
export const replayLastSound = () => {
  if (currentAudio && !isMuted) {
    currentAudio.currentTime = 0;
    currentAudio.play().catch(() => {});
  }
};

// ═══════════════════════════════════════════════
// REACTION CLASS (visual effect on the card)
// ═══════════════════════════════════════════════
export function getReactionClass(score: number): string {
  if (score > 80) return "reaction-ultra-cooked";
  if (score > 60) return "reaction-cooked";
  if (score <= 40) return "reaction-safe";
  return "";
}
