const fs = require('fs');

const savageRoasts = [
  { keywords: ["Accounting", "Finance"], roast: "You're basically a fancy calculator. AI already bought one." },
  { keywords: ["Computer Science", "Software Engineering"], roast: "Bold choice. Your future self is already updating their resume." },
  { keywords: ["Marketing", "Advertising"], roast: "AI targets better than you target your morning coffee. Career's cooked." },
  { keywords: ["Design", "Art"], roast: "Midjourney does in 5s what takes you 5 hours. Frame that final paycheck." },
  { keywords: ["Business", "Management"], roast: "AI writes the plans, humans sign the checks. You're just... in the way." },
  { keywords: ["Law", "Legal"], roast: "AI read the whole case before you finished your first espresso. Objection overruled." },
  { keywords: ["Psychology", "Sociology"], roast: "People are messy, but a chatbot is cheaper than your hourly rate." },
  { keywords: ["Education", "Teacher"], roast: "Kids won't listen to you, but they'll definitely chat with an AI tutor." },
  { keywords: ["Nursing", "Medicine"], roast: "AI can't change a bedpan. You're safe... for now. Keep the comfy shoes." },
  { keywords: ["Engineering"], roast: "Bridges don't build themselves, but AI is definitely doing the math better." },
  { keywords: ["Writing", "English", "Communication"], roast: "ChatGPT just wrote a better version of this roast. You're redundant." }
];

const fallbackRoasts = [
  "Your major is the 'participation trophy' of the AI revolution.",
  "Even the AI felt bad scanning this degree. Almost.",
  "Future career prospects: Professional prompt engineer (unpaid).",
  "This degree is a collectors item. It'll look great on a wall.",
  "AI can't wait to replace you. It's actually quite excited.",
  "You're not cooked, you're deep-fried in a silicon vat.",
  "Bold strategy. Let's see how that works out in the breadline.",
  "Hope you kept the receipt for those student loans."
];

function getSavageRoast(name) {
  for (const s of savageRoasts) {
    if (s.keywords.some(k => name.toLowerCase().includes(k.toLowerCase()))) {
      return s.roast;
    }
  }
  return fallbackRoasts[Math.floor(Math.random() * fallbackRoasts.length)];
}

const dataPath = 'src/lib/data.ts';
let content = fs.readFileSync(dataPath, 'utf8');

// Regex to find objects and update the 'roast' property
// We search for "name": "...", and then replace the next "roast": "..."
let updatedContent = content.replace(/"name":\s*"([^"]+)",[\s\n\r]*"score":\s*\d+,[\s\n\r]*"level":\s*"[^"]*",[\s\n\r]*"roast":\s*"[^"]*"/g, (match, name) => {
    const newRoast = getSavageRoast(name);
    return match.replace(/"roast":\s*"[^"]*"/, `"roast": "${newRoast}"`);
});

fs.writeFileSync(dataPath, updatedContent);
console.log(`Updated all roasts in data.ts using string manipulation.`);
