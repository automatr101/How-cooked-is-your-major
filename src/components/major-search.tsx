"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Search, X } from "lucide-react";
import { useTheme } from "next-themes";
import { BorderBeam } from "@/components/ui/border-beam-search";
import type { Major } from "@/lib/data";
import { cn } from "@/lib/utils";

interface MajorSearchProps {
  value: string;
  onChange: (value: string) => void;
  /** Matching majors, already filtered and ranked by the parent. */
  results: Major[];
  onSelect: (major: Major) => void;
  /**
   * The text in the box is a finished choice (for example a picked major's name), not a search in
   * progress: no list and no "no match" message until the visitor edits it.
   */
  selected?: boolean;
  placeholder?: string;
  /** The box's accessible name. */
  label?: string;
  /** A smaller box and rows, for pages with two search boxes side by side. */
  compact?: boolean;
  /** Seconds per lap of the glow. Give side-by-side boxes different values so they don't pulse together. */
  beamDuration?: number;
}

// The search box used on the home page and the Compare page, as an accessible combobox:
//   - type to filter, ArrowUp/ArrowDown to move through the matches, Enter to pick
//     (the top match if none is highlighted), Escape to close (again to clear)
//   - screen readers announce the matches; an empty search says so instead of showing nothing
//   - a travelling glow (border-beam) runs along the bottom edge; it stops for visitors who
//     prefer reduced motion, and follows the light/dark theme
export function MajorSearch({
  value,
  onChange,
  results,
  onSelect,
  selected = false,
  placeholder = "Search 1,800+ courses...",
  label = "Search majors",
  compact = false,
  beamDuration = 3.1,
}: MajorSearchProps) {
  const id = useId();
  const listId = `${id}-list`;
  const optionId = (i: number) => `${id}-option-${i}`;

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const reduceMotion = useReducedMotion();
  const { resolvedTheme } = useTheme();

  const query = value.trim();
  const showList = open && !selected && results.length > 0;
  const showEmpty = open && !selected && query.length > 0 && results.length === 0;
  // The list can shrink while typing, so never point past its end.
  const active = highlight < results.length ? highlight : -1;

  // Tapping or clicking anywhere outside closes the list. Blur alone isn't enough: on iPhones,
  // tapping a non-interactive part of the page doesn't take focus away from the input.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setHighlight(-1);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const choose = (major: Major) => {
    setOpen(false);
    setHighlight(-1);
    onSelect(major);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return; // don't hijack keys while an IME is composing text
    switch (e.key) {
      case "ArrowDown":
        if (results.length === 0) return;
        e.preventDefault();
        setOpen(true);
        setHighlight(active < 0 ? 0 : (active + 1) % results.length);
        break;
      case "ArrowUp":
        if (results.length === 0) return;
        e.preventDefault();
        setOpen(true);
        setHighlight(active <= 0 ? results.length - 1 : active - 1);
        break;
      case "Enter":
        if (showList) {
          e.preventDefault();
          choose(results[active >= 0 ? active : 0]);
        }
        break;
      case "Escape":
        if (open) {
          e.preventDefault();
          setOpen(false);
          setHighlight(-1);
        } else if (value) {
          e.preventDefault();
          onChange("");
        }
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  const shownQuery = query.length > 30 ? `${query.slice(0, 30)}…` : query;

  return (
    <div ref={rootRef} className="relative">
      <div className="relative group">
        <div className="absolute inset-0 bg-primary/10 rounded-2xl blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-1000" />
        <BorderBeam
          size="line"
          colorVariant="colorful"
          duration={beamDuration}
          borderRadius={16}
          theme={resolvedTheme === "light" ? "light" : "dark"}
          active={!reduceMotion}
        >
          <div className="relative flex items-center bg-card border border-border rounded-2xl overflow-hidden backdrop-blur-2xl transition-all focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/5 shadow-xl">
            <Search aria-hidden className={cn(compact ? "w-4 h-4 ml-4" : "w-5 h-5 ml-5", "shrink-0 text-muted-foreground transition-colors group-focus-within:text-primary")} />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-label={label}
              aria-expanded={showList}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="search"
              className={cn(
                "w-full min-w-0 bg-transparent border-none text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-0 font-bold tracking-tight",
                compact ? "text-base px-3 py-3.5" : "text-lg px-4 py-4"
              )}
              placeholder={placeholder}
              value={value}
              onChange={(e) => {
                onChange(e.target.value);
                setOpen(true);
                setHighlight(-1);
              }}
              onFocus={() => !selected && value.trim() && setOpen(true)}
              onClick={() => !selected && value.trim() && setOpen(true)}
              onBlur={() => setOpen(false)}
              onKeyDown={onKeyDown}
            />
            {value && (
              <button
                type="button"
                aria-label="Clear search"
                // keep focus in the input so the list doesn't flicker closed
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange("");
                  setOpen(false);
                  setHighlight(-1);
                  inputRef.current?.focus();
                }}
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                  compact ? "mr-3" : "mr-4"
                )}
              >
                <X aria-hidden className="h-5 w-5" />
              </button>
            )}
          </div>
        </BorderBeam>
      </div>

      {/* Screen readers: how many matches there are */}
      <div role="status" aria-live="polite" className="sr-only">
        {query.length === 0 || selected ? "" : results.length > 0 ? `${results.length} matching majors. Use the up and down arrow keys, then Enter.` : "No majors found."}
      </div>

      <AnimatePresence>
        {(showList || showEmpty) && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className={cn(
              "absolute top-full left-0 right-0 bg-card/80 backdrop-blur-3xl border border-border overflow-hidden shadow-2xl z-50",
              compact ? "mt-2 rounded-xl p-1.5" : "mt-4 rounded-2xl p-2"
            )}
          >
            {showList ? (
              <div id={listId} role="listbox" aria-label="Matching majors">
                {results.map((major, i) => (
                  <div
                    key={major.name}
                    id={optionId(i)}
                    role="option"
                    aria-selected={i === active}
                    // mousedown would blur the input and close the list before the click lands
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => choose(major)}
                    className={cn(
                      "w-full flex items-center justify-between text-left cursor-pointer transition-all group/item",
                      compact ? "px-4 py-3 rounded-lg text-sm" : "px-6 py-4 rounded-xl",
                      i === active ? "bg-muted" : "hover:bg-muted"
                    )}
                  >
                    <span className={cn("font-bold transition-colors", i === active ? "text-foreground" : "text-foreground/80 group-hover/item:text-foreground")}>
                      {major.name}
                    </span>
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "text-xs font-black px-2 py-1 rounded-md bg-background border border-border",
                          major.score > 70 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
                        )}
                      >
                        {major.score}%
                      </span>
                      <ArrowRight
                        aria-hidden
                        className={cn(
                          "w-4 h-4 transition-all group-hover/item:translate-x-1 group-hover/item:text-primary",
                          i === active ? "translate-x-1 text-primary" : "text-muted-foreground"
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={cn("text-sm font-bold text-muted-foreground", compact ? "px-4 py-4" : "px-6 py-5")}>
                No majors match &ldquo;{shownQuery}&rdquo;. Try fewer letters, or one word like &ldquo;nursing&rdquo;.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
