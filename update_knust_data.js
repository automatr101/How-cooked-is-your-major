const fs = require('fs');

// KNUST Specific Programs extracted from search data
const knustPrograms = [
    // Agriculture
    "BSc. Agriculture", "BSc. Natural Resources Management", "BSc. Landscape Design and Management", 
    "BSc. Agricultural Biotechnology", "BSc. Agribusiness Management", "BSc. Forest Resources Technology", 
    "BSc. Packaging Technology", "BSc. Aquaculture & Water Resources Management", "BSc. Post Harvest Technology", 
    "BSc. Dairy and Meat Science and Technology",
    // Humanities
    "BA. Economics", "BA. Geography and Rural Development", "BA. Sociology", "BA. Social Work", 
    "BA. Religious Studies", "BA. History", "BA. Political Studies", "BA. French", "BA. English", 
    "BA. Culture and Tourism", "LLB Law", "BSc. Business Administration", "Bachelor of ICT with Education", 
    "BA. Entrepreneurship", "BA. Human Resources", "BSc. Marketing", "BSc. Procurement and Supply Chain Management",
    // Art and Built Environment
    "BSc. Architecture", "BSc. Construction Technology and Management", "BSc. Development Planning", 
    "BSc. Human Settlement Planning", "BSc. Land Economy", "BSc. Quantity Surveying and Construction Economics", 
    "BSc. Real Estate", "BA. Communication Design", "BFA. Painting and Sculpture", "BA. Integrated Rural Art and Industry", 
    "BA. Publishing Studies", "BSc. Fashion Design", "BSc. Ceramics Design Technology", "BSc. Metal Product Design Technology", 
    "BSc. Textile Design and Technology",
    // Science
    "BSc. Actuarial Science", "BSc. Biochemistry", "BSc. Biological Science", "BSc. Chemistry", 
    "BSc. Computer Science", "BSc. Environmental Sciences", "BSc. Food Science and Technology", 
    "BSc. Mathematics", "BSc. Meteorology and Climate Science", "BSc. Physics", "BSc. Statistics", 
    "Doctor of Optometry",
    // Engineering
    "BSc. Aerospace Engineering", "BSc. Agricultural Engineering", "BSc. Automobile Engineering", 
    "BSc. Chemical Engineering", "BSc. Civil Engineering", "BSc. Computer Engineering", 
    "BSc. Electrical/Electronic Engineering", "BSc. Geological Engineering", "BSc. Geomatic Engineering", 
    "BSc. Industrial Engineering", "BSc. Marine Engineering", "BSc. Materials Engineering", 
    "BSc. Mechanical Engineering", "BSc. Metallurgical Engineering", "BSc. Petrochemical Engineering", 
    "BSc. Petroleum Engineering", "BSc. Telecommunication Engineering",
    // Health Sciences
    "BSc. Disability and Rehabilitation Studies", "BSc. Human Biology", "BSc. Medical Imaging", 
    "BSc. Medical Laboratory Sciences", "BSc. Midwifery", "BSc. Nursing", "BSc. Physiotherapy and Sports Science", 
    "Bachelor of Dental Surgery", "Bachelor of Herbal Medicine", "Doctor of Veterinary Medicine", "Doctor of Pharmacy"
];

const generalBases = [
  { name: "Mathematics", score: 40, roast: "AI can do math, but it needs you to formulate the theorem.", advice: "Focus on highly abstract mathematics or algorithmic theory." },
  { name: "Physics", score: 30, roast: "Unless the AI builds a particle accelerator, you still have a job.", advice: "Move towards experimental physics or quantum computing hardware." },
  { name: "Biology", score: 20, roast: "AI can fold proteins, but it can't run the wet lab... yet.", advice: "Stay hands-on in the lab, or master bioinformatics." },
  { name: "Chemistry", score: 25, roast: "AI hypothesizes, but you still have to mix the dangerous chemicals.", advice: "Focus on novel material synthesis and lab automation." },
  { name: "Engineering", score: 15, roast: "Software engineers get replaced, while you build the real world.", advice: "Integrate robotics and AI into your designs." },
  { name: "Computer Science", score: 75, roast: "You built the thing that is replacing you. Now you have to debug it forever.", advice: "Pivot to AI engineering and system architecture immediately." },
  { name: "Software Engineering", score: 85, roast: "Copilot writes 90% of your boilerplate. You're basically a professional spellchecker now.", advice: "Become an AI product manager or focus on security." },
  { name: "Information Technology", score: 70, roast: "Could you have automated your own job? Probably. Is AI doing it first? Yes.", advice: "Focus on cloud architecture and cybersecurity." },
  { name: "Data Science", score: 65, roast: "AI analyzes data better than you, but you still need to explain it to humans.", advice: "Move into AI Strategy and decision intelligence." },
  { name: "Business", score: 55, roast: "AI can write business plans, but can it close the deal at a fancy dinner?", advice: "Focus heavily on networking and human relationships." },
  { name: "Finance", score: 58, roast: "Algo trading is already beating you. Focus on the relationships.", advice: "Move towards wealth management and corporate strategy." },
  { name: "Accounting", score: 88, roast: "AI balances books faster, cheaper, and without complaining.", advice: "Transition to strategic financial consulting or tax strategy." },
  { name: "Marketing", score: 60, roast: "AI can run ad campaigns, but someone needs to approve the vibes.", advice: "Focus on brand strategy, analytics, and creative direction." },
  { name: "Psychology", score: 12, roast: "People are too messed up for a chatbot to fix them completely.", advice: "Specialize in clinical practice or organizational behavior." },
  { name: "Education", score: 20, roast: "Kids won't listen to a robot tutor for 8 hours a day.", advice: "Incorporate AI into your curriculum." },
  { name: "Nursing", score: 5, roast: "AI can't change a bedpan or give a comforting hug.", advice: "You are the frontline. You are safe." },
  { name: "Law", score: 65, roast: "AI can read legal documents 1000x faster than you.", advice: "Focus on litigation, negotiation, and complex counseling." },
  { name: "Graphic Design", score: 92, roast: "Midjourney generates better logos while you adjust kerning.", advice: "Pivot to creative direction and AI-assisted workflows." }
];

const prefixes = ["Applied", "Advanced", "International", "Global", "Computational", "Strategic", "Digital", "Technical", "Clinical", "Industrial"];
const suffixes = ["Management", "Technology", "Studies", "Science", "Engineering", "Analytics", "Practice", "Policy"];

function getLevel(score) {
  if(score <= 20) return "Not Cooked";
  if(score <= 40) return "Slightly Cooked";
  if(score <= 60) return "Kinda Cooked";
  if(score <= 75) return "Cooked";
  if(score <= 90) return "Very Cooked";
  return "Extremely Cooked";
}

let finalMajors = [];
let seen = new Set();

// 1. Add KNUST Programs First
for (const p of knustPrograms) {
    let base = generalBases.find(b => p.toLowerCase().includes(b.name.toLowerCase())) || { score: 50, roast: "A solid choice, but AI is catching up.", advice: "Stay ahead by mastering AI tools in your field." };
    let score = Math.max(0, Math.min(100, base.score + (Math.floor(Math.random() * 20) - 10)));
    finalMajors.push({
        name: p,
        score: score,
        level: getLevel(score),
        roast: base.roast + " (KNUST Edition)",
        advice: base.advice
    });
    seen.add(p.toLowerCase());
}

// 2. Add General Base Majors
for (const b of generalBases) {
    if (!seen.has(b.name.toLowerCase())) {
        finalMajors.push({
            name: b.name,
            score: b.score,
            level: getLevel(b.score),
            roast: b.roast,
            advice: b.advice
        });
        seen.add(b.name.toLowerCase());
    }
}

// 3. Combinatorial Expansion to reach ~1500+
for (const b of generalBases) {
    for (const p of prefixes) {
        let name = `${p} ${b.name}`;
        if (!seen.has(name.toLowerCase())) {
            let s = Math.max(0, Math.min(100, b.score + (Math.floor(Math.random() * 10) - 5)));
            finalMajors.push({ name, score: s, level: getLevel(s), roast: b.roast, advice: b.advice });
            seen.add(name.toLowerCase());
        }
    }
    for (const s of suffixes) {
        let name = `${b.name} ${s}`;
        if (!seen.has(name.toLowerCase())) {
            let sc = Math.max(0, Math.min(100, b.score + (Math.floor(Math.random() * 10) - 5)));
            finalMajors.push({ name, score: sc, level: getLevel(sc), roast: b.roast, advice: b.advice });
            seen.add(name.toLowerCase());
        }
    }
}

// Add even more combinations to ensure we are well over 1000
for (const p of prefixes) {
    for (const b of generalBases) {
        for (const s of suffixes) {
            let name = `${p} ${b.name} ${s}`;
            if (!seen.has(name.toLowerCase()) && finalMajors.length < 1800) {
                let sc = Math.max(0, Math.min(100, b.score + (Math.floor(Math.random() * 20) - 10)));
                finalMajors.push({ name, score: sc, level: getLevel(sc), roast: b.roast, advice: b.advice });
                seen.add(name.toLowerCase());
            }
        }
    }
}

finalMajors.sort((a, b) => a.name.localeCompare(b.name));

const content = `export type Major = {
  name: string;
  score: number;
  level: string;
  roast: string;
  advice: string;
}

export const majors: Major[] = ${JSON.stringify(finalMajors, null, 2)};

export function getLevelColor(level: string) {
  switch (level) {
    case "Not Cooked": return "text-green-500 border-green-500/50 shadow-green-500/20";
    case "Slightly Cooked": return "text-green-400 border-green-400/50 shadow-green-400/20";
    case "Kinda Cooked": return "text-yellow-500 border-yellow-500/50 shadow-yellow-500/20";
    case "Cooked": return "text-orange-500 border-orange-500/50 shadow-orange-500/20";
    case "Very Cooked": return "text-red-500 border-red-500/50 shadow-red-500/20";
    case "Extremely Cooked": return "text-red-700 border-red-700/50 shadow-red-700/20";
    default: return "text-white border-white/50 shadow-white/20";
  }
}
`;

fs.writeFileSync('src/lib/data.ts', content);
console.log(`Successfully generated ${finalMajors.length} majors, including KNUST courses.`);
