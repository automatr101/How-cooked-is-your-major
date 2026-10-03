// Cleans free text from visitors before it is sent on to Telegram.

// Control characters, plus zero-width and bidi-override characters that could be used to
// disguise text in the chat. Checked by code point (not a regex) so the source stays plain ASCII.
function isUnwanted(cp: number): boolean {
  return (
    cp <= 0x1f ||
    cp === 0x7f ||
    (cp >= 0x200b && cp <= 0x200f) || // zero-width space/joiners, LRM/RLM
    (cp >= 0x2028 && cp <= 0x202e) || // line/paragraph separators, bidi embeddings and overrides
    (cp >= 0x2060 && cp <= 0x2069) || // word joiner, invisible operators, bidi isolates
    cp === 0xfeff // byte order mark / zero-width no-break space
  );
}

/** One line of plain text, at most `max` characters. Anything that isn't a string becomes "". */
export function cleanText(raw: unknown, max: number): string {
  if (typeof raw !== "string") return "";
  // Array.from walks whole code points, so emoji are never cut in half
  const chars = Array.from(raw).map((ch) => (isUnwanted(ch.codePointAt(0)!) ? " " : ch));
  const flat = chars.join("").replace(/\s+/g, " ").trim();
  return Array.from(flat).slice(0, max).join("");
}
