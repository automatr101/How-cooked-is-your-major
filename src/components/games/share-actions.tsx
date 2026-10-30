"use client";

import { useEffect, useState, type RefObject } from "react";
import { Check, Download, Share2 } from "lucide-react";
import { SITE_URL } from "@/lib/site";
import { track } from "@/lib/analytics";

// Share buttons for a finished game. The card (a square dark tile, see GameCard) is turned into a PNG only when someone taps.
// On a phone the share sheet gets the image and the text; elsewhere the text + link is copied and the image can be saved.

type Props = {
  cardRef: RefObject<HTMLElement | null>;
  game: "wordle" | "cooked-or-cap" | "major-wars";
  day: number;
  text: string; // e.g. "Major Wordle #12 4/6" plus the emoji grid
  result: string; // for analytics, e.g. "4" or "fail"
};

export function gameLink(game: string, source: string, medium: string): string {
  return `${SITE_URL}/activities/${game}?utm_source=${source}&utm_medium=${medium}&utm_campaign=games_share&utm_content=${game}`;
}

export function ShareActions({ cardRef, game, day, text, result }: Props) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [native, setNative] = useState(false);
  useEffect(() => setNative(typeof navigator !== "undefined" && typeof navigator.share === "function"), []);

  const png = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    try {
      const { toBlob } = await import("html-to-image");
      return await toBlob(cardRef.current, { cacheBust: true, pixelRatio: 3 }); // 360px card -> 1080px
    } catch {
      return null;
    }
  };

  const fire = (method: string) => track("game_share", { game, method, result, day });

  const onShare = async () => {
    const full = `${text}\n${gameLink(game, native ? "share_sheet" : "copy_link", "referral")}`;
    if (native) {
      try {
        const blob = await png();
        const file = blob ? new File([blob], `${game}-${day}.png`, { type: "image/png" }) : null;
        const withFile = file && navigator.canShare?.({ files: [file] });
        await navigator.share(withFile ? { files: [file], text: full } : { text: full });
        fire("native_share");
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(full);
      fire("copy_link");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const onSave = async () => {
    const blob = await png();
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `cooked-major-${game}-${day}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    fire("download");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const btn =
    "inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60";
  return (
    <div className="flex flex-wrap justify-center gap-3">
      <button type="button" onClick={onShare} className={`${btn} bg-foreground text-background`}>
        {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
        {copied ? "Copied" : "Share"}
      </button>
      <button type="button" onClick={onSave} className={`${btn} border border-foreground/20`}>
        {saved ? <Check className="h-4 w-4" /> : <Download className="h-4 w-4" />}
        {saved ? "Saved" : "Save card"}
      </button>
    </div>
  );
}
