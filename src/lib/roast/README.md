# Roast engine

Builds the roast shown on a result card. Local only: no API, no keys, instant.

```
rollRoast({ name, score }) -> { text, category, layer, tier, discipline }
```

## How it works

1. **Tier** from the score: low (0-40), mid (41-60), high (61-80), extreme (81-100). Sets the tone.
2. **Name analysis** (`names.ts`): a short "nick" for jokes (long names like
   "Clinical Graphic Design Technology" become "Graphic Design"), a **discipline** (cs, law, nursing...)
   and a broader **group** when no discipline matches.
3. **Candidates**: every template valid for that tier + discipline + group. This is the fallback ladder:
   discipline roasts -> group roasts -> tier roasts -> general student/career -> internet/absurd.
   The last three always exist, so every major gets a roast.
4. **Category first, then template** (`engine.ts`): categories are picked by weight, skipping the last
   two used; then a template inside it, skipping the last 45 shown. That is why consecutive roasts differ.
5. **Tokens** are filled (`{major}`, `{ai}`, `{pct}`...). AI names avoid recently used ones, and two AI
   tokens in one roast never match. A slang opener / emoji tail is added to short lines some of the time.
6. Too long (over 150 characters, the card clips there), unresolved, or recently shown: rejected and retried.

Memory of what was shown lives in `sessionStorage`, so it survives navigation within a visit.

## Adding content

| You want to add | Where |
|---|---|
| a general roast | `templates.ts`: `add("category", TIERS, ["line"])` |
| a roast for one discipline | `disciplines.ts`: that discipline's `roasts` |
| a whole new discipline | `disciplines.ts`: new entry (put it before broader ones: first match wins) |
| a new AI model | `pools.ts`: the right `AI_*` list |
| more slang openers / emoji | `pools.ts`: `OPENERS`, `TAILS`, `PUNCH` |

Rules for lines: short (median today is 75 characters), aimed at the major and the job market and never at
the person, no slurs, nothing sexual or cruel, and AI jokes are satire, not factual claims. Use `LOW`
(or `LM`) for "you're fine" lines and `HX` / `EXTREME` / `MH` for doom lines.

## Checking your work

```bash
npm run roast:check              # lint every line + simulate thousands of sessions
npm run roast:check -- --samples # also print sample roasts for a few majors
```

The checker fails if a token is unknown, a line is a duplicate or contains a banned word, a doom line is
tagged `LOW`, a roast is too long, the same text repeats within 25 presses, the same category or AI model
appears twice in a row, or any of the 1,820 majors would get no roast.
