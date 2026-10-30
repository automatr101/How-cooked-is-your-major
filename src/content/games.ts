// Copy and data for the daily games. Edit here, not in the components.

// Major Wordle answers: five letters, uppercase, campus / degree / career flavoured. One per day, in this order, then it loops.
export const WORDLE_ANSWERS = [
  "ESSAY","GRADE","MAJOR","CLASS","STUDY","FINAL","EXAMS","LEARN","LOANS","TUTOR","HONOR","DORMS","BREAK","PAPER","NOTES",
  "TERMS","SKILL","CODER","NURSE","AUDIT","TAXES","STOCK","BANKS","LEGAL","ROBOT","MODEL","CLOUD","LOGIC","MATHS","ATOMS",
  "CELLS","FORCE","DRAFT","HIRED","FIRED","WAGES","TEAMS","SHIFT","GRIND","ROAST","BURNT","FRIED","SALTY","SCORE","RANKS",
  "QUOTA","PITCH","TRADE","VALUE","BRAND","MEDIA","PRESS","WRITE","PIXEL","PAINT","MUSIC","STAGE","DRAMA","MORAL","PLANT",
  "FARMS","WATER","POWER","WIRES","BUILD","STEEL","DRONE","CHIPS","BYTES","LOGIN",
] as const;

// WEF statements for Cooked or Cap? True ones and their false twins. Always a projection, always with the source.
export const WEF_SOURCE = "WEF Future of Jobs Report 2025 (projection)";
export const FACT_QUESTIONS: { text: string; answer: boolean; why: string; source: string }[] = [
  { text: "The WEF projects 170 million new roles will be created by 2030.", answer: true, why: "A projection, not a promise.", source: WEF_SOURCE },
  { text: "The WEF projects 92 million roles will be displaced by 2030.", answer: true, why: "Some jobs go, others appear.", source: WEF_SOURCE },
  { text: "The WEF projects a net gain of 78 million jobs by 2030.", answer: true, why: "170 million created minus 92 million displaced.", source: WEF_SOURCE },
  { text: "The WEF projects the world ends up with fewer jobs overall by 2030.", answer: false, why: "It projects a net gain of 78 million.", source: WEF_SOURCE },
  { text: "The WEF projects nearly 40% of skills will change by 2030.", answer: true, why: "Skills move faster than degrees.", source: WEF_SOURCE },
  { text: "The WEF projects only about 4% of skills will change by 2030.", answer: false, why: "It projects nearly 40%.", source: WEF_SOURCE },
  { text: "The WEF projects more roles displaced than created by 2030.", answer: false, why: "170 million created beats 92 million displaced.", source: WEF_SOURCE },
  { text: "The WEF projects only 17 million new roles by 2030.", answer: false, why: "It projects 170 million.", source: WEF_SOURCE },
];

export const SITE_FACT_QUESTIONS: { text: string; answer: boolean; why: string }[] = [
  { text: "The cooked scan on this site costs money.", answer: false, why: "The scan is free. The career plan is optional." },
  { text: "The career plan is optional.", answer: true, why: "The scan is free either way." },
];
