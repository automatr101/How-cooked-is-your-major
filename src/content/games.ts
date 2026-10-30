// Copy and data for the daily games. Edit here, not in the components.

// Major Wordle answers: five letters, uppercase, campus / degree / career flavoured. One per day, in this order, then it loops.
export const WORDLE_ANSWERS = [
  "ESSAY","GRADE","MAJOR","CLASS","STUDY","FINAL","EXAMS","LEARN","LOANS","TUTOR","HONOR","DORMS","BREAK","PAPER","NOTES",
  "TERMS","SKILL","CODER","NURSE","AUDIT","TAXES","STOCK","BANKS","LEGAL","ROBOT","MODEL","CLOUD","LOGIC","MATHS","ATOMS",
  "CELLS","FORCE","DRAFT","HIRED","FIRED","WAGES","TEAMS","SHIFT","GRIND","ROAST","BURNT","FRIED","SALTY","SCORE","RANKS",
  "QUOTA","PITCH","TRADE","VALUE","BRAND","MEDIA","PRESS","WRITE","PIXEL","PAINT","MUSIC","STAGE","DRAMA","MORAL","PLANT",
  "FARMS","WATER","POWER","WIRES","BUILD","STEEL","DRONE","CHIPS","BYTES","LOGIN",
  // Added later: always APPEND, never reorder. A day's word is its position in this list, so moving one changes past puzzles and breaks streaks.
  "DEBTS","GRANT","FUNDS","LEASE","RENTS","ASSET","YIELD","SALES","DEALS","OFFER","HIRES","STAFF","UNION","UNITS","ARRAY",
  "DEBUG","LOOPS","QUERY","STACK","ROUTE","PATCH","TOKEN","PROXY","CACHE","INPUT","EMAIL","ALERT","CHART","GRAPH","TABLE",
  "INDEX","FIELD","THEME","TOPIC","JUDGE","COURT","TRIAL","CLAIM","RIGHT","RULES","ETHIC","CIVIL","CRIME","PRISM","LASER",
  "OPTIC","WAVES","LIGHT","SOUND","MOTOR","BRAKE","GEARS","BEAMS","BOLTS","ROADS","TOWER","SOLAR","WINDS","CROPS","SEEDS",
  "VIRUS","PILLS","PULSE","BLOOD","BONES","BRAIN","HEART","LUNGS","TEETH","FLASK","ATLAS","GLOBE","STATE","TREND","POEMS",
  "NOVEL","PROSE","VERSE","SCENE","FILMS","COLOR","FONTS","LAYER","FRAME","SHOOT","DANCE","CHOIR","PIANO","TEMPO","CHORD",
  "ENTRY","FAILS","FOCUS","SLEEP","SNACK",
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
  { text: "The WEF projects 92 million new roles will be created by 2030.", answer: false, why: "It projects 170 million created and 92 million displaced.", source: WEF_SOURCE },
  { text: "The WEF projects 170 million roles will be displaced by 2030.", answer: false, why: "It projects 92 million displaced. 170 million is the roles created.", source: WEF_SOURCE },
  { text: "The WEF projects a net gain of only 7 million jobs by 2030.", answer: false, why: "It projects a net gain of 78 million.", source: WEF_SOURCE },
  { text: "The WEF projects nearly 70% of skills will change by 2030.", answer: false, why: "It projects nearly 40%.", source: WEF_SOURCE },
  { text: "The WEF numbers for 2030 are projections, not promises.", answer: true, why: "Nobody can guarantee a job market that far out.", source: WEF_SOURCE },
  { text: "The WEF projects the net change in jobs by 2030 is a gain of 78 million.", answer: true, why: "170 million created minus 92 million displaced.", source: WEF_SOURCE },
];

export const SITE_FACT_QUESTIONS: { text: string; answer: boolean; why: string }[] = [
  { text: "The cooked scan on this site costs money.", answer: false, why: "The scan is free. The career plan is optional." },
  { text: "The career plan is optional.", answer: true, why: "The scan is free either way." },
  { text: "The cooked score runs from 0 to 100.", answer: true, why: "Lower is safer. Higher is more cooked." },
  { text: "The cooked score is a guarantee about your career.", answer: false, why: "It is entertainment, not career advice." },
  { text: "Not Cooked is one of the verdict labels.", answer: true, why: "The four labels: Not Cooked, Slightly Cooked, Kinda Cooked, Cooked." },
  { text: "The scan gives you a share card.", answer: true, why: "Your score, your verdict, your roast." },
];
