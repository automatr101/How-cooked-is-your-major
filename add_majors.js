const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'lib', 'data.ts');
let content = fs.readFileSync(filePath, 'utf8');

const currentMajorsNames = new Set();
const match = content.match(/"name":\s*"([^"]+)"/g);
if (match) {
  match.forEach(m => currentMajorsNames.add(m.split('"name": "')[1].slice(0, -1)));
}

const newMajorsList = [
  { name: "BSc Administration (Accounting)", base: "Accounting" },
  { name: "BSc Administration (Marketing)", base: "Marketing" },
  { name: "BSc Administration (Human Resource Management)", base: "Business" },
  { name: "BSc Administration (Public Administration)", base: "Business" },
  { name: "BSc Administration (Health Services Management)", base: "Nursing" },
  { name: "BSc Administration (Banking and Finance)", base: "Finance" },
  { name: "BSc Information Technology (IT)", base: "Computer Science" },
  { name: "B.Ed. Early Grade Specialism", base: "Education" },
  { name: "B.Ed. Upper-Grade Specialism", base: "Education" },
  { name: "B.Ed. J.H.S Specialism", base: "Education" },
  { name: "BSc. Telecommunication Engineering", base: "Engineering" },
  { name: "BSc. Computer Engineering", base: "Computer Science" },
  { name: "BSc. Mobile Computing", base: "Computer Science" },
  { name: "BSc. Software Engineering", base: "Computer Science" },
  { name: "BSc. Business Information Systems", base: "Data Science" },
  { name: "BSc. Data Science & Analytics", base: "Data Science" },
  { name: "BSc Cyber Security", base: "Computer Science" },
  { name: "BSc. Procurement and Logistics", base: "Business" },
  { name: "BSc. Financial Technology", base: "Finance" },
  { name: "BSc. Economics", base: "Finance" },
  { name: "BSc. Accounting with Computing", base: "Accounting" },
  { name: "BSc. Human Resource Management", base: "Business" }
];

const roasts = {
  "Accounting": "AI balances books faster, cheaper, and without complaining.",
  "Marketing": "AI can target your audience better than you can target your morning coffee.",
  "Business": "AI can write business plans, but can it close the deal at a fancy dinner?",
  "Nursing": "AI can diagnose, but can it hold a hand when it counts?",
  "Finance": "Algo trading is already beating you. Focus on the relationships.",
  "Computer Science": "You built the thing that is replacing you. Now you have to debug it forever.",
  "Education": "Kids won't listen to a robot tutor for 8 hours a day.",
  "Engineering": "Software engineers get replaced, while you build the real world.",
  "Data Science": "AI analyzes data better than you, but you still need to explain it to humans."
};

const salaryMap = {
  'Engineering': { min: 80, max: 150, growth: [5, 15] },
  'Computer Science': { min: 90, max: 180, growth: [-5, 10] },
  'Data Science': { min: 95, max: 170, growth: [10, 25] },
  'Medicine': { min: 150, max: 400, growth: [2, 8] },
  'Nursing': { min: 65, max: 110, growth: [8, 18] },
  'Graphic Design': { min: 45, max: 95, growth: [-15, -2] },
  'Marketing': { min: 50, max: 120, growth: [-10, 5] },
  'Accounting': { min: 60, max: 130, growth: [-8, 2] },
  'Biology': { min: 55, max: 140, growth: [3, 12] },
  'Chemistry': { min: 60, max: 150, growth: [2, 10] },
  'Education': { min: 45, max: 85, growth: [1, 5] },
  'Business': { min: 55, max: 160, growth: [-5, 8] },
  'Finance': { min: 70, max: 160, growth: [-5, 8] }
};

const levels = (score) => {
  if (score > 90) return "Extremely Cooked";
  if (score > 75) return "Very Cooked";
  if (score > 60) return "Cooked";
  if (score > 40) return "Kinda Cooked";
  if (score > 20) return "Slightly Cooked";
  return "Not Cooked";
};

const scores = {
  "Accounting": 85,
  "Marketing": 72,
  "Business": 55,
  "Nursing": 15,
  "Finance": 60,
  "Computer Science": 75,
  "Education": 20,
  "Engineering": 15,
  "Data Science": 65
};

const advice = {
  "Accounting": "Transition to strategic financial consulting or tax strategy.",
  "Marketing": "Focus on high-level creative strategy and brand psychology.",
  "Business": "Focus heavily on networking and human relationships.",
  "Nursing": "Specialize in nursing informatics or geriatric care.",
  "Finance": "Move towards wealth management and corporate strategy.",
  "Computer Science": "Pivot to AI engineering and system architecture immediately.",
  "Education": "Incorporate AI into your curriculum.",
  "Engineering": "Integrate robotics and AI into your designs.",
  "Data Science": "Move into AI Strategy and decision intelligence."
};

function getMetadata(base, score) {
  let val = salaryMap[base] || { min: 50, max: 100, growth: [-10, 10] };
  const growth = Math.round(val.growth[1] - (score / 100) * (val.growth[1] - val.growth[0]));
  const minSal = Math.round(val.min * (1 + (100 - score) / 200));
  const maxSal = Math.round(val.max * (1 + (100 - score) / 200));
  return {
    salary: `$${minSal}k - $${maxSal}k`,
    growth: `${growth > 0 ? '+' : ''}${growth}% Growth`
  };
}

const added = [];
newMajorsList.forEach(m => {
  if (!currentMajorsNames.has(m.name)) {
    const score = scores[m.base] + Math.floor(Math.random() * 10 - 5);
    const meta = getMetadata(m.base, score);
    const obj = {
      name: m.name,
      score: score,
      level: levels(score),
      roast: roasts[m.base],
      advice: advice[m.base],
      salary: meta.salary,
      growth: meta.growth
    };
    added.push(obj);
  }
});

if (added.length > 0) {
  const lastBracket = content.lastIndexOf('];');
  const newText = added.map(o => `  ${JSON.stringify(o, null, 2)}`).join(',\n') + ',\n';
  content = content.slice(0, lastBracket) + newText + content.slice(lastBracket);
  fs.writeFileSync(filePath, content);
  console.log(`Added ${added.length} new courses!`);
} else {
  console.log("No new courses to add.");
}
