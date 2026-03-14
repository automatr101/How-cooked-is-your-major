# MVP Product Requirements Document (PRD)

## Project: How Cooked Is Your Major?

### UI Framework: Magic UI

---

# 1. MVP Objective

The MVP is a **simple interactive web tool** where students can search for their university major and instantly see how vulnerable it is to AI automation.

The experience should feel **modern, animated, and visually impressive** using **Magic UI components**.

Core interaction:

Search → Select Major → View Cooked Result

No backend or authentication required.

---

# 2. Tech Stack

Frontend Framework
Next.js (App Router)

Styling
Tailwind CSS

UI Components
Magic UI

Language
TypeScript

Deployment
Vercel

---

# 3. Core Features

## 3.1 Major Search

Users must be able to search for their major using a search bar.

Requirements:

* Autocomplete suggestions
* Real-time filtering
* Case-insensitive search
* Clicking a suggestion loads the result

UI Components to Use:

Magic UI:

* **Input Component**
* **Animated List / Command List**

Behavior:

Typing filters majors instantly.

Example:

User types:

comp

Suggestions:

Computer Science
Computer Engineering
Computational Biology

---

# 3.2 Major Result Card

After selecting a major, a **result card appears with an animated transition**.

The card displays:

Major Name
AI Risk Score
Cooked Level
Roast Message
Survival Advice

Magic UI components to use:

* **Card**
* **Animated Gradient Border**
* **Number Ticker (for score animation)**

Example Output:

Major: Graphic Design

AI Risk Score: **82%**

Cooked Level: **Very Cooked**

Roast
AI can generate logos in seconds while you adjust kerning.

Advice
Learn UI/UX design and AI-assisted workflows.

---

# 4. Cooked Level System

Score ranges map to cooked levels.

| Score  | Level            |
| ------ | ---------------- |
| 0–20   | Not Cooked       |
| 21–40  | Slightly Cooked  |
| 41–60  | Kinda Cooked     |
| 61–75  | Cooked           |
| 76–90  | Very Cooked      |
| 91–100 | Extremely Cooked |

These levels should display with **different visual colors**.

Example:

Not Cooked → green
Kinda Cooked → yellow
Cooked → orange
Very Cooked → red
Extremely Cooked → dark red

---

# 5. Data Structure

Majors stored locally in a JavaScript/TypeScript object.

Example:

```ts
const majors = {
  "Graphic Design": {
    score: 82,
    level: "Very Cooked",
    roast: "AI generates logos while you adjust kerning.",
    advice: "Learn UI/UX and AI-assisted design."
  },

  "Accounting": {
    score: 66,
    level: "Cooked",
    roast: "AI balances books faster than interns.",
    advice: "Focus on financial consulting and strategy."
  },

  "Computer Science": {
    score: 35,
    level: "Slightly Cooked",
    roast: "AI writes code but someone still needs to debug it.",
    advice: "Learn AI engineering and system architecture."
  }
}
```

The MVP should contain **20–30 majors**.

---

# 6. Page Layout

The homepage should be vertically structured.

Sections:

1. Hero Section
2. Search Section
3. Result Card (hidden until selection)

---

# 7. Hero Section

Components to use:

Magic UI:

* **Animated Gradient Text**
* **Sparkles Effect**
* **Background Grid Pattern**

Content:

Title
**How Cooked Is Your Major?**

Subtitle
Find out how AI might affect your degree.

CTA
Search your major below.

---

# 8. Search Section

Centered search bar with autocomplete suggestions.

Magic UI components:

* Input
* Command palette style list

Behavior:

Typing filters the majors dataset instantly.

---

# 9. Result Card Animation

When a major is selected:

1. Result card fades in
2. Score animates from 0 → final value
3. Card border glows depending on cooked level

Magic UI components:

* Animated Card
* Number Ticker
* Gradient Border

---

# 10. Design Requirements

Visual style should feel:

Modern
Playful
Minimal
Highly interactive

Color scheme:

Dark background
High contrast text
Bright accent colors for cooked levels

Typography:

Large bold headline
Readable body text

---

# 11. Performance Requirements

The site must:

Load instantly
Be fully responsive
Work on mobile devices
Use minimal dependencies

---

# 12. MVP Scope

Included in MVP:

Hero section
Search bar with autocomplete
Major dataset
Cooked level scoring
Animated result card
Magic UI visual effects

Not included in MVP:

Leaderboards
Social sharing
AI-generated roasts
Charts
User accounts

---

# 13. Deployment

The project should be deployed as a **static Next.js site** on Vercel.

Requirements:

Fast page load
Mobile responsive
Production-ready build

---

# 14. Success Criteria

The MVP is successful if:

Users can quickly search their major
Results appear instantly
The UI feels polished and interactive
The site is visually impressive due to Magic UI animations

If you'd like, I can also write the **perfect build prompt for your coding agent** so it generates this **entire Magic UI + Next.js project automatically** (folder structure, components, dataset, animations, everything). That’s usually the step that saves the most time.
