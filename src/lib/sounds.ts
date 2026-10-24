// ═══════════════════════════════════════════════
// 🔊 Sound Reaction System — sounds.ts
// Mobile-first: handles iOS/Android autoplay restrictions
// ═══════════════════════════════════════════════

import { useSyncExternalStore } from "react";
import { pickResultSound, RESULT_SOUNDS, soundTierOf, soundUrl, type SoundTier } from "./sound-pools";

const MUTE_KEY = "cm_muted";

// No sound plays longer than this, so a future long clip can't make noise for ages. The meme sounds
// are all 5 seconds or shorter and end on their own; anything longer is faded out after MAX_PLAY_MS.
const MAX_PLAY_MS = 5200;
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

// AudioContext for bulletproof mobile unlock
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    // Older iOS Safari only has the prefixed name
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new Ctx();
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
  playToken++; // a sound still downloading must not start after this
  for (const audio of [currentAudio]) {
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

// ── Vibrate helper ─────────────────────────────
function vibrate(pattern: number | number[]) {
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch {}
}

// ═══════════════════════════════════════════════
// LOADING: whole file first, then play (no streaming)
// ═══════════════════════════════════════════════
// A sound that streams while it plays stutters and cuts out on a slow connection. So every sound is downloaded in
// full into memory (a blob URL) before it is allowed to play, and the next sound for each cooked level is fetched
// ahead of time, so when a result appears its sound is usually already waiting. A sound that is still not ready
// shortly after the result shows is replaced by one that is, or skipped: a late or broken sound is worse than none.

const loaded = new Map<string, string>(); // name -> blob URL, fully downloaded
const loading = new Map<string, Promise<string | null>>();

function fetchSound(name: string): Promise<string | null> {
  const done = loaded.get(name);
  if (done) return Promise.resolve(done);
  const inFlight = loading.get(name);
  if (inFlight) return inFlight;
  const p = fetch(soundUrl(name))
    .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      loaded.set(name, url);
      return url;
    })
    .catch(() => null) // a failed download can be tried again on a later scan
    .finally(() => loading.delete(name));
  loading.set(name, p);
  return p;
}

/** Slow or data-saving connections: fetch only what is about to play, never ahead. */
function shouldPrefetch(): boolean {
  try {
    const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    return !(c?.saveData || c?.effectiveType === "slow-2g" || c?.effectiveType === "2g");
  } catch {
    return true;
  }
}

// The sound each cooked level will play next, chosen in advance so it can be downloaded before the scan.
const TIERS: SoundTier[] = ["low", "mid", "high", "extreme"];
const nextPick: Partial<Record<SoundTier, string>> = {};
const recentSounds: string[] = []; // played this visit, newest first, so the same one does not repeat

function planNext(tier: SoundTier) {
  // Plan only from the level's own pool (the occasional cooked sound on a green result is decided at scan time)
  const pool = RESULT_SOUNDS[tier];
  const avoid = new Set([...(Object.values(nextPick) as string[]), ...recentSounds.slice(0, 2)]);
  const options = pool.filter((n) => !avoid.has(n));
  const from = options.length ? options : pool;
  const name = from[Math.floor(Math.random() * from.length)];
  nextPick[tier] = name;
  if (shouldPrefetch()) fetchSound(name);
}

let warmed = false;
/** Download the next sound for every cooked level (a few hundred KB), once, when the browser is idle. */
export function warmSounds() {
  if (warmed || typeof window === "undefined") return;
  warmed = true;
  const run = () => TIERS.forEach((t) => !nextPick[t] && planNext(t));
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  if (w.requestIdleCallback) w.requestIdleCallback(run, { timeout: 4000 });
  else setTimeout(run, 1500);
}

function chooseResultSound(score: number): string {
  const tier = soundTierOf(score);
  const fresh = pickResultSound(score, recentSounds); // includes the green-result joke when it comes up
  const planned = nextPick[tier];
  // Use the sound downloaded in advance, unless this scan drew the joke (a cooked sound on a green result)
  const name = planned && RESULT_SOUNDS[tier].includes(fresh) ? planned : fresh;
  recentSounds.unshift(name);
  recentSounds.length = Math.min(recentSounds.length, 6);
  if (name === planned) planNext(tier); // line up the one after it
  return name;
}

// ═══════════════════════════════════════════════
// SCAN: choose + start downloading on the click, play when the result shows
// ═══════════════════════════════════════════════
const LATE_LIMIT_MS = 1200; // how long after the result shows a sound may still start
let pending: { name: string; tier: SoundTier; ready: Promise<string | null>; token: number } | null = null;
let playToken = 0;

function vibrateFor(score: number) {
  if (score > 80) vibrate([200, 100, 200, 100, 400]);
  else if (score > 60) vibrate([100, 50, 100]);
  else vibrate([50, 50, 50]);
}

function playUrl(url: string) {
  if (muted()) return;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }
  currentAudio = new Audio(url);
  startPlayback(currentAudio);
}

export function preloadResultSound(score: number) {
  warmSounds();
  // Chosen now (during the click), so the one downloading during the scan animation is the one that plays.
  const name = chooseResultSound(score);
  pending = { name, tier: soundTierOf(score), ready: fetchSound(name), token: ++playToken };
}

export function playPendingSound(score: number) {
  vibrateFor(score);
  if (muted()) return;
  const p = pending;
  pending = null;
  if (!p) {
    playResultSound(score);
    return;
  }
  const now = loaded.get(p.name);
  if (now) {
    playUrl(now);
    return;
  }
  const late = new Promise<null>((r) => setTimeout(() => r(null), LATE_LIMIT_MS));
  Promise.race([p.ready, late]).then((url) => {
    if (p.token !== playToken || muted()) return; // the visitor has moved on: stay quiet
    if (url) return playUrl(url);
    // Not here in time: play a sound for this level that is already downloaded, or nothing at all
    const backup = [...RESULT_SOUNDS[p.tier], ...recentSounds].find((n) => loaded.has(n));
    if (backup) playUrl(loaded.get(backup)!);
  });
}

// ═══════════════════════════════════════════════
// RESULT SOUNDS (direct play — works when called
// directly from a click handler with no delay)
// ═══════════════════════════════════════════════
export const playResultSound = (score: number) => {
  vibrateFor(score);
  if (muted()) return;
  const name = chooseResultSound(score);
  const token = ++playToken;
  fetchSound(name).then((url) => {
    if (url && token === playToken) playUrl(url);
  });
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
