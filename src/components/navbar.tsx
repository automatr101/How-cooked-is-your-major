"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrainCircuit, Menu, Volume2, VolumeX, X } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { toggleMute, useMuted } from "@/lib/sounds";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/compare", label: "Compare" },
  { href: "/privacy", label: "Privacy" },
];

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70";
const ICON_BUTTON = `grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 active:scale-95 ${FOCUS_RING}`;

// Two stacked copies of the label in one grid cell (so the wider one sets the width).
// Hovering or focusing the parent `.group` rolls the first copy up and the second in.
function RollText({ children, hover }: { children: string; hover?: string }) {
  return (
    <span className="grid overflow-hidden text-center">
      <span className="col-start-1 row-start-1 transition-transform duration-300 group-hover:-translate-y-full group-focus-visible:-translate-y-full motion-reduce:transition-none">
        {children}
      </span>
      <span
        aria-hidden
        className="col-start-1 row-start-1 translate-y-full transition-transform duration-300 group-hover:translate-y-0 group-focus-visible:translate-y-0 motion-reduce:transition-none"
      >
        {hover ?? children}
      </span>
    </span>
  );
}

function MuteButton({ muted, onToggle }: { muted: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label="Mute sounds"
      aria-pressed={muted}
      title={muted ? "Unmute sounds" : "Mute sounds"}
      className={ICON_BUTTON}
    >
      {muted ? <VolumeX className="h-4 w-4 text-white/60" /> : <Volume2 className="h-4 w-4" />}
    </button>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const muted = useMuted(); // saved in localStorage; shared with the sound system
  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // While the mobile menu is open: Escape closes it (focus returns to the burger),
  // and so does pressing anywhere outside the header.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  // On the home page, glide to the search box and focus it. Elsewhere the link
  // navigates to /#search and the browser handles the jump.
  const handleScan = (e: React.MouseEvent) => {
    setOpen(false);
    if (pathname !== "/") return;
    e.preventDefault();
    const target = document.getElementById("search");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    window.setTimeout(() => target?.querySelector("input")?.focus({ preventScroll: true }), reduce ? 0 : 400);
  };

  const handleMute = () => {
    toggleMute();
  };

  return (
    <header ref={headerRef} className="fixed inset-x-0 top-3 z-[100] px-3 sm:px-6">
      <nav aria-label="Main" className="relative mx-auto max-w-5xl">
        <div className="grid h-16 grid-cols-[auto_1fr_auto] items-center rounded-full border border-white/10 bg-black px-2 text-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)] md:grid-cols-[1fr_auto_1fr]">
          {/* Logo */}
          <Link
            href="/"
            aria-label="CookedMajor home"
            className={cn("group grid h-12 w-12 place-items-center justify-self-start rounded-full bg-white text-black", FOCUS_RING)}
          >
            <BrainCircuit className="h-6 w-6 transition-transform duration-700 group-hover:[transform:rotateY(-360deg)] motion-reduce:transition-none" />
          </Link>

          {/* Desktop links */}
          <ul className="col-start-2 hidden items-center gap-1 md:flex">
            {LINKS.map(({ href, label }) => {
              const active = isActive(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative block rounded-full px-4 py-2 text-sm font-medium transition-colors",
                      active ? "text-white" : "text-white/60 hover:text-white",
                      FOCUS_RING
                    )}
                  >
                    <RollText>{label}</RollText>
                    {active && (
                      <span aria-hidden className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-white" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Right side */}
          <div className="col-start-3 flex items-center gap-2 justify-self-end">
            {/* Mute is always on the bar; the theme toggle moves into the menu on phones */}
            <MuteButton muted={muted} onToggle={handleMute} />
            <div className="hidden md:block">
              <ThemeToggle />
            </div>

            <Link
              href="/#search"
              onClick={handleScan}
              className={cn(
                "group grid h-10 place-items-center rounded-full bg-white px-5 text-sm font-semibold text-black transition active:scale-95",
                FOCUS_RING
              )}
            >
              <RollText hover="Roast me 🔥">Scan yours</RollText>
            </Link>

            {/* Mobile menu button: burger turns into an X */}
            <button
              ref={toggleRef}
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              className={cn(ICON_BUTTON, "relative md:hidden")}
            >
              <Menu
                className={cn(
                  "absolute inset-0 m-auto h-5 w-5 transition duration-300 motion-reduce:transition-none",
                  open ? "rotate-90 opacity-0" : "rotate-0 opacity-100"
                )}
              />
              <X
                className={cn(
                  "absolute inset-0 m-auto h-5 w-5 transition duration-300 motion-reduce:transition-none",
                  open ? "rotate-0 opacity-100" : "-rotate-90 opacity-0"
                )}
              />
            </button>
          </div>
        </div>

        {/* Mobile menu panel. `invisible` when closed keeps its links out of the tab order. */}
        <div
          id="mobile-menu"
          className={cn(
            "absolute inset-x-0 top-[calc(100%+0.5rem)] rounded-[2rem] border border-white/10 bg-black p-6 text-white shadow-2xl transition-[opacity,transform,visibility] duration-300 motion-reduce:transition-none md:hidden",
            open ? "visible translate-y-0 opacity-100" : "pointer-events-none invisible -translate-y-3 opacity-0"
          )}
        >
          <ul className="flex flex-col items-center gap-1">
            {LINKS.map(({ href, label }) => {
              const active = isActive(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2 rounded-full px-6 py-3 text-lg font-semibold transition-colors",
                      active ? "text-white" : "text-white/60 hover:text-white",
                      FOCUS_RING
                    )}
                  >
                    {label}
                    {active && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 flex items-center justify-center border-t border-white/10 pt-5">
            <ThemeToggle />
          </div>
        </div>
      </nav>
    </header>
  );
}
