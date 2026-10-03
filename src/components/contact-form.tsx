"use client";

import { useState } from "react";
import { SuccessIcon } from "@/components/ui/animated-state-icons";

const MAX_MESSAGE = 2000;
const MIN_MESSAGE = 10;

type Status = "idle" | "sending" | "sent" | "error" | "limited" | "unavailable";

const FIELD =
  "w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40";
const LABEL = "text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground";

// Name, email and message, sent to /api/contact (which forwards it to Telegram).
export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [hp, setHp] = useState(""); // honeypot: real visitors never see or fill this
  const [status, setStatus] = useState<Status>("idle");

  const ready = /^\S+@\S+\.\S{2,}$/.test(email.trim()) && message.trim().length >= MIN_MESSAGE;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || status === "sending") return;
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message, hp }),
      });
      if (res.status === 429) return setStatus("limited");
      if (res.status === 503) return setStatus("unavailable");
      if (!res.ok) return setStatus("error");
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  };

  if (status === "sent") {
    return (
      <div role="status" className="rounded-3xl border border-border bg-card p-8 text-center space-y-4">
        <SuccessIcon active size={56} className="mx-auto text-emerald-500" />
        <p className="text-xl font-black tracking-tight">Message sent. Thank you!</p>
        <p className="text-sm text-muted-foreground">We read everything, and we&apos;ll reply to the email you gave if one is needed.</p>
        <button
          type="button"
          onClick={() => {
            setName("");
            setEmail("");
            setMessage("");
            setStatus("idle");
          }}
          className="text-xs font-black uppercase tracking-widest text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="relative rounded-3xl border border-border bg-card p-6 sm:p-8 space-y-5">
      <div className="space-y-2">
        <label htmlFor="contact-name" className={LABEL}>
          Name (optional)
        </label>
        <input id="contact-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" className={FIELD} />
      </div>

      <div className="space-y-2">
        <label htmlFor="contact-email" className={LABEL}>
          Email
        </label>
        <input
          id="contact-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={120}
          autoComplete="email"
          placeholder="you@example.com"
          className={FIELD}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="contact-message" className={LABEL}>
          Message
        </label>
        <textarea
          id="contact-message"
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={MAX_MESSAGE}
          rows={6}
          placeholder="Feedback, a wrong score, a business question..."
          className={`${FIELD} resize-none`}
        />
        <p className="text-right text-[10px] font-bold text-muted-foreground/60" aria-hidden>
          {message.length}/{MAX_MESSAGE}
        </p>
      </div>

      {/* Honeypot */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Leave this empty
          <input tabIndex={-1} autoComplete="off" name="hp" value={hp} onChange={(e) => setHp(e.target.value)} />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={!ready || status === "sending"}
          className="rounded-full bg-primary px-7 py-3 text-xs font-black uppercase tracking-widest text-primary-foreground transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {status === "sending" ? "Sending…" : "Send message"}
        </button>
        {status === "error" && (
          <span role="alert" className="text-xs font-bold text-destructive">
            Couldn&apos;t send that. Please try again.
          </span>
        )}
        {status === "limited" && (
          <span role="alert" className="text-xs font-bold text-destructive">
            You&apos;ve sent a few messages already. Please try again later.
          </span>
        )}
        {status === "unavailable" && (
          <span role="alert" className="text-xs font-bold text-destructive">
            Messages are switched off right now. Please try again later.
          </span>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Your message, name and email go to us as a private message. We don&apos;t publish them. See the{" "}
        <a href="/privacy" className="underline underline-offset-2 hover:text-foreground">
          privacy policy
        </a>
        .
      </p>
    </form>
  );
}
