export type SoundLevel = "safe" | "mid" | "cooked" | "ultra_cooked";

let currentAudio: HTMLAudioElement | null = null;
let isMuted = false;

export const toggleMute = () => {
  isMuted = !isMuted;
  if (isMuted && currentAudio) {
    currentAudio.pause();
  }
  return isMuted;
};

export const getIsMuted = () => isMuted;

export const getResultReactionLevel = (score: number): SoundLevel => {
  if (score <= 40) return "safe";
  if (score <= 60) return "mid";
  if (score <= 80) return "cooked";
  return "ultra_cooked";
};

export const playResultSound = (score: number) => {
  if (isMuted) return;

  // Stop previous sound
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }

  let src = "";
  if (score <= 40) {
    src = "/sounds/crowd-clap.wav"; // safe
  } else if (score <= 60) {
    src = "/sounds/discord-notification.mp3"; // mid
  } else if (score <= 80) {
    // cooked (randomly pick between among-us-dead and prowler)
    src = Math.random() > 0.5 ? "/sounds/among-us-dead.mp3" : "/sounds/prowler-meme.wav";
  } else {
    // ultra cooked
    src = "/sounds/shotgun-funny.wav";
  }

  currentAudio = new Audio(src);
  currentAudio.play().catch(e => console.log('Audio playback failed', e));

  // Trigger subtle mobile vibration if supported
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try {
      if (score > 80) {
        navigator.vibrate([200, 100, 200, 100, 400]); // heavy shake for ultra cooked
      } else if (score > 60) {
        navigator.vibrate([100, 50, 100]); // stutter for cooked
      } else if (score > 40) {
        navigator.vibrate(100); // subtle tap for mid
      } else {
        navigator.vibrate([50, 50, 50]); // quick purr for safe
      }
    } catch(e) {}
  }
};

export const replayLastSound = () => {
    if (currentAudio && !isMuted) {
        currentAudio.currentTime = 0;
        currentAudio.play().catch(e => console.log('Audio playback failed', e));
    }
};
