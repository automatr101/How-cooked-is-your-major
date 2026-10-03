// ═══════════════════════════════════════════════
// 🔊 Sound Reaction System — sounds.ts
// Mobile-first: handles iOS/Android autoplay restrictions
// ═══════════════════════════════════════════════

import { useSyncExternalStore } from "react";

const MUTE_KEY = "cm_muted";

// No sound plays longer than this. prowler-meme.wav is ~11 seconds, which feels endless,
// so everything is cut off with a short fade after MAX_PLAY_MS.
const MAX_PLAY_MS = 4000;
const FADE_MS = 400;

// Mute is remembered in localStorage so it survives refreshes and new visits.
// It is read lazily on first use because this module also loads on the server.
let isMuted = false;
let mutedLoaded = false;
const muteListeners = new Set<() => void>();

function loadMuted() {
  if (mutedLoaded || typeof window === "undefined") return;
  mutedLoaded = true;
  try {
    isMuted = localStorage.getItem(MUTE_KEY) === "1";
  } catch {}
}

const muted = () => {
  loadMuted();
  return isMuted;
};

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
export const getIsMuted = () => muted();

const notifyMuteListeners = () => muteListeners.forEach((l) => l());

export const toggleMute = () => {
  loadMuted();
  isMuted = !isMuted;
  try {
    localStorage.setItem(MUTE_KEY, isMuted ? "1" : "0");
  } catch {}
  if (isMuted) stopAllSounds();
  notifyMuteListeners();
  return isMuted;
};

const subscribeMuted = (cb: () => void) => {
  muteListeners.add(cb);
  // keep other open tabs in sync
  const onStorage = (e: StorageEvent) => {
    if (e.key !== MUTE_KEY) return;
    isMuted = e.newValue === "1";
    if (isMuted) stopAllSounds();
    notifyMuteListeners();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    muteListeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
};

/** React hook: the saved mute state. Renders as "not muted" on the server, then updates. */
export function useMuted(): boolean {
  return useSyncExternalStore(subscribeMuted, getIsMuted, () => false);
}

// ── Core playback ──────────────────────────────
let stopTimer: ReturnType<typeof setTimeout> | null = null;
let fadeTimer: ReturnType<typeof setInterval> | null = null;

function clearTimers() {
  if (stopTimer) clearTimeout(stopTimer);
  if (fadeTimer) clearInterval(fadeTimer);
  stopTimer = fadeTimer = null;
}

/** Stop whatever is playing right now (used on mute, tab switch and leaving the page). */
export function stopAllSounds() {
  clearTimers();
  for (const audio of [currentAudio, pendingAudio]) {
    if (!audio) continue;
    audio.pause();
    audio.currentTime = 0;
  }
}

// Play from the start at full volume, then fade out and stop after MAX_PLAY_MS.
function startPlayback(audio: HTMLAudioElement) {
  clearTimers();
  audio.volume = 1;
  audio.currentTime = 0;
  audio.play().catch(() => {});
  stopTimer = setTimeout(() => {
    if (audio !== currentAudio || audio.paused) return;
    const steps = 8;
    let step = 0;
    fadeTimer = setInterval(() => {
      step++;
      audio.volume = Math.max(0, 1 - step / steps);
      if (step >= steps) {
        clearTimers();
        audio.pause();
        audio.volume = 1;
      }
    }, FADE_MS / steps);
  }, MAX_PLAY_MS - FADE_MS);
}

function playSound(src: string) {
  if (muted()) return;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }
  currentAudio = new Audio(src);
  startPlayback(currentAudio);
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
  if (muted()) return;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }
  if (pendingAudio) {
    currentAudio = pendingAudio;
    pendingAudio = null;
    startPlayback(currentAudio);
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
  if (muted()) return;
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

// Sounds only play in response to something the visitor just did (scanning a major, or
// pressing Replay). Nothing plays on page load, tab switches or navigation.

// ═══════════════════════════════════════════════
// REPLAY
// ═══════════════════════════════════════════════
export const replayLastSound = () => {
  if (currentAudio && !muted()) {
    startPlayback(currentAudio);
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
