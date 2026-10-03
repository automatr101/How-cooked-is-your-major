import type { GroupId, Template, Tier } from "./types";
import { LOW, LM, MID, MH, HX, EXTREME } from "./types";
import { hash } from "./util";

const HIGH: Tier[] = ["high"];

// ═══════════════════════════════════════════════════════════════════════════
// HOW TO ADD ROASTS
//
//   add("category", TIERS, ["line one", "line two"]);
//
// • category: any string. New categories work immediately (default weight 1; tune weights
//   in engine.ts → CATEGORY_WEIGHT). Existing ones: career, jobhunt, internship, linkedin,
//   salary, debt, fouryears, family, graduation, unemployed, overqualified, underqualified,
//   corporate, entrylevel, absurd, motivational, brochose, existential, dramatic, backhanded,
//   twist, internet, backup, assignment, professor, fyp, ai_replace, ai_assist, ai_vs_human,
//   ai_student, ai_resume, ai_models, ai_advice.
// • TIERS: when the line fits. Use LOW for "you're fine" lines, COOKED / MH / HX / EXTREME for
//   negative ones, or `null` for lines that work at any cooked level (absurd, student-life).
//   Never put a "you're doomed" line on LOW.
// • Tokens: {major} {pct} {ai} {ai2} {ai3} {aiCode} {aiSearch} {aiImg} {aiDoc} {punch} {#10-99}
//   and, only inside addHybrid(): {d.people} {d.jobs} {d.grind} {d.tool} {d.pain}.
// • Keep it short: the result card clips at about 150 characters once tokens are filled in.
// • Aim at the major and the job market, never at the person. No slurs, no sex, nothing cruel.
//   AI lines are satire: no factual claims that a specific model can or can't replace a job.
// • Run `npm run roast:check` after editing. It lints the content and prints samples.
// ═══════════════════════════════════════════════════════════════════════════

export const TEMPLATES: Template[] = [];

function push(cat: string, tiers: Tier[] | null, text: string, extra: Partial<Template> = {}) {
  TEMPLATES.push({
    id: `${cat}:${hash(text)}`,
    cat,
    text,
    tiers: tiers ?? undefined,
    needsDisc: /\{d\./.test(text) || undefined,
    ...extra,
  });
}

function add(cat: string, tiers: Tier[] | null, texts: string[]) {
  for (const text of texts) push(cat, tiers, text);
}

// ───────────────────────────────────────────────────────────────────────────
// CAREER / JOB MARKET
// ───────────────────────────────────────────────────────────────────────────

add("career", HX, [
  "{major} grads: the job market called. it said 'who?'",
  "{major}: great degree, if you enjoy 'exploring opportunities' for 14 months.",
  "your career is a loading screen and it's been 4 years.",
  "the career outlook for {major} is giving 'we'll let you know'.",
]);
add("career", MH, [
  "your career path is a group project: lots of people involved, nobody doing anything.",
  "{major} has a bright future. it's just in a different timeline.",
]);
add("career", LOW, [
  "the job market looked at {major} and said 'yeah, we'll take that'. respect.",
  "your career has better odds than most. don't make it weird.",
  "future employers will love you. your relatives will still ask 'but what do you do?'",
  "{major} is out here being employable. suspicious, but go off.",
]);

add("jobhunt", HX, [
  "applied to {#80-400} jobs. got {#1-6} replies. most were newsletters.",
  "you'll apply, get ghosted, apply again, and call it 'a numbers game'.",
  "the job portal asked you to upload your résumé, then retype all of it. we move.",
  "referral? bro your network is a group chat of classmates also applying.",
]);
add("jobhunt", MH, [
  "job hunting is a full-time job that pays in 'we've decided to move forward with other candidates'.",
  "{#20-90} applications sent. a human has read, at best, {#1-4} of them.",
  "'we'll keep your résumé on file' means 'we have a file for this, it's called the recycle bin'.",
]);
add("jobhunt", LM, [
  "you'll apply to 6 places and hear back from 5. enjoy being weirdly employable.",
  "the job hunt will be short. recruiters already have {major} saved in a folder called 'yes'.",
]);

add("internship", HX, [
  "internship offer: unpaid, 6 months, 'great exposure', free lanyard.",
  "every internship wants experience and every experience wants an internship. enjoy the loop.",
  "your internship rejection arrived faster than the application confirmation.",
  "you'll get an internship. it'll be unpaid. but the free pen is elite.",
]);
add("internship", MH, [
  "'we received your application' is the new 'goodbye'.",
  "internship season: 400 applicants, 3 spots, and one of them is the boss's nephew.",
]);
add("internship", LOW, [
  "internship recruiters are fighting over {major}. you're in the 'choose your offer' arc.",
  "you'll get the internship, then the return offer, then the 'wow, that was easy' speech.",
]);

add("linkedin", HX, [
  "your LinkedIn says 'open to work' in green. it's getting more reactions than your applications.",
  "you posted 'excited to start a new chapter'. the chapter is called 'unemployed'.",
  "500+ connections, 0 interviews. the math checks out.",
  "your LinkedIn arc is entering its villain era.",
]);
add("linkedin", MH, [
  "LinkedIn is where everyone is 'thrilled to announce' and you are thrilled to log off.",
  "the LinkedIn influencer says 'it's a mindset'. the bank says 'it's a balance'.",
  "you refreshed LinkedIn {#4-60} times today. the jobs did not refresh with you.",
]);
add("linkedin", LOW, [
  "you're the kind of person who posts 'thrilled to announce' and actually means it. unfair.",
  "your LinkedIn is about to get a lot of 'congrats!!' from people you don't remember.",
]);

add("salary", HX, [
  "{major} pays in 'experience' and 'networking opportunities'. both non-negotiable, apparently.",
  "the salary isn't the problem. it's the 3 years of 'unpaid trial period' first.",
  "'competitive salary' in the job post. the number was a rumor.",
]);
add("salary", MH, [
  "the salary range looks nice until you remember 'up to' is doing a lot of work.",
  "your future salary is dreaming big. your landlord is dreaming bigger.",
]);
add("salary", LM, [
  "the salary looks healthy. try not to be insufferable about it.",
  "pay is fine. suspiciously fine. someone check for the catch.",
]);

add("debt", HX, [
  "the degree cost a house. the first offer is a 'studio apartment of exposure'.",
  "you owe the bank more than your degree currently earns. ambitious.",
  "your debt is growing faster than your career. impressive compound interest, honestly.",
]);
add("debt", MH, [
  "student loans: because 'we believe in you' wasn't expensive enough.",
  "the loan statement arrives right on time. the job offer, not so much.",
]);
add("debt", LM, [
  "student debt exists, but so does a decent job outlook. balance.",
  "the loans are real, but so is the paycheck. we call that a fair fight.",
]);

add("fouryears", HX, [
  "4 years, thousands in tuition, and the reward is 'let me think about it' from a recruiter.",
  "four years of lectures to learn that 'the real learning starts on the job'.",
]);
add("fouryears", MH, [
  "four years and one group project later, you've learned 'reply all' is a weapon.",
  "bro, four years for this? the answer is 'the free pizza at orientation'.",
]);
add("fouryears", LOW, [
  "four years well spent. rare. frame this result.",
  "4 years and the plan actually worked. someone call the school, they'll want to know.",
]);

add("family", MH, [
  "your parents: 'what will you do with that?' you: 'be fine, hopefully.'",
  "mom told the whole family you're 'doing great'. the pressure is now higher than the unemployment rate.",
  "the family WhatsApp group knows your major better than you know your future.",
]);
add("family", HX, [
  "your uncle: 'have you tried applying?' bro it's literally the only thing we do.",
  "your relatives' idea of career advice is 'ask a politician'. not great.",
]);
add("family", LOW, [
  "you can finally tell your relatives 'i'm fine'. they'll ask you to fix their phone anyway.",
  "mom will brag about you to the neighbors by Friday. let her.",
]);

add("graduation", HX, [
  "graduation day: 'congratulations!' next day: 'so... what now?'",
  "you'll walk across that stage, then straight into a 'we're not hiring' wall.",
  "the cap and gown looked great. the job market looked away.",
]);
add("graduation", LM, [
  "graduation will be a vibe. the job offers will also be a vibe.",
  "walk the stage like the job market already said yes.",
]);
add("graduation", null, [
  "graduation photos are the last time anyone asks 'how's it going?' with real enthusiasm.",
]);

add("unemployed", HX, [
  "unemployment isn't a status, it's a hobby with {#200-600} applications.",
  "'between opportunities' is such a polite way to say 'refreshing my inbox'.",
  "being unemployed in {major} is an experience. unfortunately not a paid one.",
]);
add("unemployed", MH, [
  "gap year? bro it's a 'career sabbatical with intense job searching'.",
  "the gap on your résumé is just a 'passion project' wearing sweatpants.",
]);

add("overqualified", MH, [
  "overqualified for entry-level, underqualified for everything else. peak {major}.",
  "'you're overqualified' is a fancy way of saying 'we don't want to pay you'.",
]);
add("overqualified", HX, [
  "the job asked for a bachelor's, 5 years experience and a Nobel prize. for 'competitive pay'.",
]);
add("underqualified", MH, [
  "recruiter: 'we want someone fresh.' also recruiter: 'with 4 years of experience.'",
  "you're technically qualified. for the job description from 2014.",
]);

add("corporate", null, [
  "corporate life: a calendar full of meetings that could've been 'k'.",
  "'quick call' means 90 minutes. welcome to the office.",
  "the office printer: an enemy since day one.",
]);
add("corporate", MH, [
  "your future boss will say 'we're a family'. families don't schedule you for Friday at 5:59pm.",
  "you'll love your first job until the 'team building' exercise.",
]);
add("corporate", LOW, [
  "corporate will love you. try not to become 'let's circle back' guy.",
  "you'll skip the entry-level phase entirely. someone has to be the main character.",
]);

add("entrylevel", HX, [
  "entry-level role. requirements: 5 years experience, a master's, and 'passion'.",
  "entry-level jobs: where 'junior' means senior and 'competitive pay' means 'it's a number'.",
  "the first rung of the ladder requires you to already be at the top. bold.",
]);
add("entrylevel", MH, [
  "entry-level means you start at the bottom, but the bottom needs a degree and a portfolio.",
  "bro spent years preparing for a job that asks for 3 years of experience in a 2-year-old tool.",
]);

// ───────────────────────────────────────────────────────────────────────────
// BRO REALLY CHOSE / BACKHANDED / DRAMATIC / TWISTS
// ───────────────────────────────────────────────────────────────────────────

add("brochose", HX, [
  "bro looked at 1,800 majors and said 'this one'. confidence.",
  "bro really enrolled in {major} like the job market was going to wait.",
  "generational mistake: choosing {major} and assuming it'd 'just work out'.",
  "bro really thought {major} would be a flex. it's a 'mildly embarrassing' flex.",
]);
add("brochose", MH, [
  "bro chose {major} like it was a loading screen skip. it wasn't.",
  "bro really chose {major} in the era of {ai}. brave.",
]);
add("brochose", LOW, [
  "bro really chose {major} and it's working?? who's your advisor?",
  "you picked {major} and it paid off. the rest of us are pretending to be happy for you.",
]);

add("backhanded", HX, [
  "{major} is a great degree. for someone else. in a different economy.",
  "you picked {major}? that's so brave. 'ski jump in flip-flops' brave.",
  "you're not the problem, the job market is. but you did pick the job market's favorite victim.",
]);
add("backhanded", MH, [
  "this major is for people who 'love learning'. and then 'love learning' some more.",
  "honestly, {major} is underrated. mostly by employers, but that's their loss.",
  "you did great picking {major}! (not an endorsement, just emotional support)",
]);
add("backhanded", LOW, [
  "okay {major}, you ate this and that's honestly annoying.",
  "this is a good result. i'd say 'congrats' but i'm too jealous.",
]);

add("dramatic", HX, [
  "{pct}%. let that sink in. the economy certainly did.",
  "i'm not saying it's over, but i'm also not saying it isn't.",
  "this isn't a result, it's a 'sit down, bestie' moment.",
  "i need everyone to be quiet for 10 seconds for {major}.",
]);
add("dramatic", MH, [
  "no because why does it feel like the algorithm just sighed at {major}?",
  "we need to talk about {major} and your 'future plans' slide.",
]);

add("twist", HX, [
  "great news: {major} has a future. bad news: it's in 'Q4 of some other economy'.",
  "'{major}? solid.' — nobody who does the hiring, ever.",
  "you've got a promising career ahead of you. just kidding, it's a rough draft.",
]);
add("twist", MH, [
  "you'll be fine in about 3 to 5 years. in the meantime: vibes.",
  "plot twist: the career you wanted was the friends you made along the way. also unpaid.",
]);
add("twist", LM, [
  "you were worried for nothing. which is exactly what a worried person would say.",
  "this is the 'surprisingly good' plot twist nobody saw coming.",
]);

add("existential", HX, [
  "somewhere out there, a {major} job exists. it's just in a dimension where 'no experience needed' is true.",
  "what is a career? what is a degree? why are there {#200-600} pending applications?",
  "we're all just tuition-paying atoms in a hiring-freeze universe.",
]);
add("existential", null, [
  "you've reached the 'what is it all for?' part of the degree. it's week 3.",
]);

add("motivational", MH, [
  "believe in yourself! (the interviewer doesn't, but that's a them problem.)",
  "fake it till you make it. unfortunately, the bank doesn't accept 'fake' as collateral.",
  "'dream big' said the poster. the poster has a salary.",
]);
add("motivational", HX, [
  "you miss 100% of the jobs you don't apply to. you also miss 99% of the ones you do.",
  "motivational tip: 'believe in yourself'. practical tip: 'also apply to 200 jobs'.",
]);
add("motivational", LOW, [
  "believe in yourself. the data finally agrees.",
  "manifest harder. you're the one person it seems to be working for.",
]);
add("motivational", null, [
  "remember: every great founder started with nothing. also a rich uncle.",
]);

add("backup", HX, [
  "your backup plan needs a backup plan. and a nap.",
  "plan B is 'move back home'. plan C is 'move back home but quietly'.",
  "have a backup plan. then another. then a 'plan Z' in the notes app.",
]);
add("backup", MH, [
  "'start a podcast' isn't a backup plan, bro.",
  "your backup plan is 'figure it out later'. it's later. hello.",
]);
add("backup", LOW, [
  "backup plan? you don't need one. that's the flex.",
  "you're allowed to have a backup plan. you just won't need it.",
]);

// ───────────────────────────────────────────────────────────────────────────
// STUDENT LIFE (works at any cooked level)
// ───────────────────────────────────────────────────────────────────────────

add("assignment", null, [
  "you submitted at 11:59pm. the deadline was 11:59pm. the wifi had other plans.",
  "the 'quick assignment' was 14 pages. the quick part was your sanity leaving.",
  "group project: 1 person works, 3 'contribute ideas', everyone gets the same grade.",
  "the deadline got extended by a week. you still started the night before.",
  "'let me just check one thing' turned into 14 browser tabs and zero progress.",
]);
add("professor", null, [
  "professor: 'this will be on the exam.' narrator: it was not on the exam.",
  "your professor's 'office hours' are a myth, like good library wifi.",
  "the professor read the slides aloud for 90 minutes. you learned 'slide 3 has a typo'.",
  "professors say 'this isn't graded' and then grade it. a scam.",
  "your professor says 'it's simple'. the whole class collectively sees a ghost.",
]);
add("fyp", null, [
  "final-year project: 6 months of planning, 4 days of work, 1 night of regret.",
  "your supervisor said 'looks good'. it did not. you know it did not.",
  "FYP defense: where you pretend to know what you built.",
  "your final-year project has 3 chapters, 2 bugs, and 1 'we'll fix that in future work'.",
  "FYP report: 70 pages, 10 of which are actual content.",
]);

// ───────────────────────────────────────────────────────────────────────────
// ABSURD / INTERNET (works at any cooked level unless tiered)
// ───────────────────────────────────────────────────────────────────────────

add("absurd", HX, [
  "a raccoon with a LinkedIn account has {#2-5} job offers. {major} has 'we'll be in touch'.",
  "if {major} were a wifi network it'd be 'connected, no internet'.",
  "if {major} was a Netflix show it'd be 'canceled after one season (4 years)'.",
  "this major is a group project where the group is the economy.",
  "somewhere a toaster is unemployed too. you two should talk.",
  "your career is a 'choose your own adventure' book where every page says 'start over'.",
  "if unemployment was a sport you'd be on the varsity team.",
  "{major} is the sourdough starter of careers: needs constant attention and nobody knows why it smells.",
]);
add("absurd", MH, [
  "your career prospects: loading... loading... loading...",
  "the vibes are 'microwaved leftovers at 2am': questionable, but somehow still warm.",
  "a pigeon with a business card has a better network than the average {major} grad.",
]);
add("absurd", LOW, [
  "you're the final boss of 'surprisingly employed'.",
  "a goldfish could get a job in {major} right now. you'll do even better, probably.",
  "if {major} were a smoothie it'd be the green one that actually tastes good. rare.",
]);
add("absurd", null, [
  "your degree is a side quest. the main quest is 'find a job'.",
  "plot twist: the group project teacher was the final boss.",
]);

add("internet", HX, [
  "main character? no. you're 'NPC with a student ID' right now.",
  "'delulu is the solulu' only works if the delulu has a degree that works.",
  "your LinkedIn arc is cooked and the sequel isn't greenlit.",
  "we need to talk about your 'plan B'. also 'plan C' and 'plan lowkey-living-at-home'.",
]);
add("internet", MH, [
  "you're not behind, you're in a side quest phase. a long one.",
  "your career is buffering. the little circle's been spinning since freshman year.",
  "you might be onto something. we just don't know what, and neither does LinkedIn.",
  "it's giving 'we'll circle back'.",
  "side quest unlocked: 'find a job that pays in actual money'.",
]);
add("internet", LM, [
  "main character energy. the job market blinked first.",
  "no notes. okay, one note: don't get cocky.",
]);
add("internet", null, [
  "the final boss isn't the exam. it's 'tell me about yourself'.",
  "character development takes time. yours is on episode 3 of 40.",
]);
add("internet", EXTREME, [
  "absolutely finished. no further notes. thank you for your service.",
]);

// ───────────────────────────────────────────────────────────────────────────
// AI CULTURE (satire; not every roast mentions AI)
// ───────────────────────────────────────────────────────────────────────────

add("ai_replace", HX, [
  "{ai} finished the first draft of {major} while you were still looking for a pen.",
  "your degree took 4 years. {aiCode} needed 'one coffee break' to learn the basics.",
  "{ai} read the whole {major} syllabus in 4 seconds and asked 'is that it?'",
  "{ai} entered the chat and your competitive advantage left through the window.",
  "{ai} said 'i'm just here to help' and HR hit the 'restructuring' button.",
  "the new hiring strategy: ask {ai} to compare candidates. you're the control group.",
]);
add("ai_replace", MH, [
  "AI isn't taking your job, it's just 'reviewing your application'. forever.",
  "{aiSearch} found 400 jobs for {major}. you found 3. two were scams.",
]);
add("ai_replace", LOW, [
  "{ai} looked at {major} and said 'oh, you need humans for this'. flex.",
  "{ai} wrote one paragraph about your major and asked a human to double-check it. that's you.",
]);

add("ai_assist", MH, [
  "learn {ai} well and your skills double. ignore it and your job description gets 'revised'.",
  "{major} + {ai} = 'surprisingly employable'. {major} alone = 'ask me in 3 years'.",
  "pro tip: {ai} can make your résumé shine. the 3-year gap, though...",
]);
add("ai_assist", LM, [
  "the future: {ai} drafts, you edit, the boss thinks you're a genius. you're welcome.",
  "{ai} is your intern now. you've been promoted. nobody told HR.",
]);
add("ai_assist", null, [
  "'prompt engineer' is the new 'i'll figure it out'.",
]);

add("ai_vs_human", MH, [
  "human vs {ai}: you bring 'creativity and soul', {ai} brings 'speed and no rent'.",
  "at least you have emotional intelligence. {ai} still replies 'great question!' to everything.",
]);
add("ai_vs_human", HX, [
  "{ai} has 100% availability. you have 'moods'. choose your fighter.",
]);
add("ai_vs_human", null, [
  "{ai} never gets a hangover, burnout or 'a quick call'. you do. that's called personality.",
  "{ai} writes faster. you write messier. HR accepts both.",
]);

add("ai_student", null, [
  "you used {ai} for the essay, {ai2} for the citations, and prayed during the plagiarism check.",
  "your study plan: 'ask {ai}'. backup plan: 'ask {ai2}'. third plan: 'panic'.",
  "you asked {ai} to explain the topic. it did. you still don't get it. relatable.",
  "group chat: 'did anyone understand this?' everyone: 'i asked {ai}'. nobody understood.",
]);
add("ai_student", MH, [
  "{ai} cooked your assignment. the professor cooked your grade.",
  "{ai} could've done the assignment in 8 seconds. you did it in 8 hours. memories though.",
]);

add("ai_resume", null, [
  "{ai} wrote your résumé, {ai2} rewrote it, and now it sounds like a robot with a motivational poster.",
  "you asked {ai} for 'a résumé that gets interviews'. it wrote 'please hire me' in 14 fonts.",
]);
add("ai_resume", MH, [
  "'passionate team player with excellent communication skills'. every cover letter. thanks, {ai}.",
]);
add("ai_resume", HX, [
  "the ATS read your résumé and responded with 'hmm' in binary.",
  "your résumé is optimized for the ATS. the ATS is optimized for 'no'.",
]);

add("ai_models", MH, [
  "{ai} updated your CV, {ai2} drafted the follow-up, and the recruiter still wrote 'thanks but no'.",
  "{ai} gave you 5 career paths. {ai2} gave you 5 different ones. you have 10 paths and 0 interviews.",
]);
add("ai_models", MID, [
  "{ai} says you're fine. {ai2} says you're cooked. the group chat is split at {pct}%.",
]);
add("ai_models", HX, [
  "the AI models held a vote on {major}: {ai} abstained, {ai2} laughed, {ai3} asked for a recount.",
]);
add("ai_models", null, [
  "{ai} and {ai2} argued about your career for 10 minutes and agreed on 'maybe touch grass'.",
]);

add("ai_advice", MH, [
  "you asked {ai} for career advice and it said 'follow your passion'. your landlord said 'follow the rent'.",
  "asking {ai} about your future is the modern 'consulting a fortune cookie'. it also says 'maybe'.",
]);
add("ai_advice", HX, [
  "{ai} on {major}: 'a promising field with many opportunities.' the job board: 'lol'.",
]);
add("ai_advice", null, [
  "{ai} told you to 'diversify your skills'. you diversified. now you're mediocre at 5 things.",
]);

// Coding assistants, image tools and document tools (these pools are smaller, so they need their own lines)
add("ai_assist", MH, [
  "{aiCode} wrote the whole function. you wrote 'TODO: understand this'.",
  "{aiCode} shipped a feature while you were still naming the repo.",
]);
add("ai_replace", HX, [
  "you: 'i'll just learn to code.' {aiCode}: 'say less.'",
  "everyone's a 'vibe coder' now. you're a {major} grad vibing at a job board.",
  "{aiCode} just opened a pull request on your career. no description, 1,400 lines changed.",
]);
add("ai_assist", LM, [
  "{aiCode} will handle the boring parts of {major}. you handle the 'why'. that's a promotion.",
]);
add("ai_student", null, [
  "{aiDoc} summarized your 400-page reading list in 90 seconds. you opened it anyway, just to feel something.",
  "{aiDoc} made flashcards for the whole semester. you made a playlist. both are study methods.",
]);
add("ai_vs_human", MH, [
  "{aiImg} made 40 logo options in a minute. the client picked the one from 2009.",
  "everyone's an 'AI artist' now. you spent four years learning what {aiImg} does in 8 seconds.",
]);
add("fyp", null, [
  "{aiCode} wrote 80% of your final-year project. you wrote the acknowledgements and panicked at the demo.",
]);
add("assignment", null, [
  "{aiCode} autocompleted your assignment. the plagiarism checker autocompleted its suspicion.",
]);
add("internship", HX, [
  "this internship wants '3 years of {aiCode} experience'. the tool is 18 months old. cool cool.",
]);
add("entrylevel", MH, [
  "entry-level role: 2 years of {aiCode}, 'a passion for AI', and no actual job title to put on it.",
]);
add("ai_advice", MH, [
  "{aiDoc} turned your career plan into a neat summary. the summary was 'apply more'.",
]);

// ───────────────────────────────────────────────────────────────────────────
// HYBRID: discipline-flavoured lines. Only used when the major matches a discipline.
// Tokens {d.people} {d.jobs} {d.grind} {d.tool} {d.pain} come from disciplines.ts.
// ───────────────────────────────────────────────────────────────────────────

add("hybrid", HX, [
  "{d.people} spend four years on {d.grind} so {ai} can do it in 4 seconds. respect for the effort.",
  "an internship for {d.jobs}: unpaid, 6 months, and the free pen is the best part.",
  "{d.people}: surviving {d.pain} just to hear 'we'll be in touch'.",
  "LinkedIn says {d.jobs} are 'in demand'. LinkedIn also says 'be the 1,043rd applicant'.",
]);
add("hybrid", MH, [
  "{d.people} get 4 years of {d.grind} and a salary that says 'thanks for your service'.",
  "{d.tool} taught you everything except how to get hired.",
  "you'll survive {d.pain}. the job hunt is just that, with better lighting.",
  "somewhere {d.jobs} are being hired. you just haven't met the recruiter. or the wifi.",
  "in the {ai} era, {d.jobs} either learn the new tools or become the cautionary tale.",
]);
add("hybrid", LOW, [
  "{d.people} are weirdly safe right now. {ai} keeps recommending them, which is just rude.",
  "{d.jobs} are a hot ticket. {d.grind} finally paid off. take the W.",
]);

// ───────────────────────────────────────────────────────────────────────────
// GROUP LEVEL (LEVEL 2 fallback): for majors in a broad family without a specific discipline
// ───────────────────────────────────────────────────────────────────────────

function addGroup(group: GroupId, tiers: Tier[] | null, texts: string[]) {
  for (const text of texts) push("group", tiers, text, { group });
}

addGroup("stem", null, [
  "labs, projects, deadlines and a group chat that says 'who's doing the report?'",
]);
addGroup("stem", MH, [
  "your degree has more formulas than your wallet has dollars.",
  "STEM degree: hard enough to be proud of, vague enough that 'what do you do?' takes 10 minutes.",
]);
addGroup("stem", LM, [
  "{ai} can do the math. you still have to do the 'explain it to the client' part.",
]);
addGroup("health", null, [
  "healthcare degrees: long hours, short breaks, and a lifetime of 'quick question about my knee' texts.",
]);
addGroup("health", MH, [
  "your degree is respected by everyone and paid by almost nobody.",
  "future you will say 'i love my job' with the face of a cat at bath time.",
]);
addGroup("health", LM, [
  "{ai} can't care for anyone. you can. job security with a side of burnout.",
]);
addGroup("commerce", null, [
  "your degree is 70% jargon, 20% group projects and 10% 'let's circle back'.",
]);
addGroup("commerce", MH, [
  "everyone in your program has a 'side hustle' that is just dropshipping a phone case.",
  "corporate will love you for 6 months, then call it 'restructuring'.",
]);
addGroup("commerce", LOW, [
  "you'll be fine. there's always another meeting that needs a person to say 'per my last email'.",
]);
addGroup("arts", MH, [
  "your degree makes you interesting at parties and mysterious to HR.",
  "{ai} can imitate your style in 9 seconds. it can't have 'a vision' and a breakdown at 3am. yet.",
]);
addGroup("arts", HX, [
  "creative fields: where 'we love your work' means 'we'd love it free'.",
]);
addGroup("arts", null, [
  "the portfolio is strong. the 'portfolio' of income is conceptual art.",
]);
addGroup("people", null, [
  "you studied people for 4 years and the job market still baffles you.",
]);
addGroup("people", MH, [
  "your degree is about understanding humans, and HR is the final boss that proves you can't.",
  "you'll change lives. your own just needs a few more applications first.",
]);
addGroup("people", LM, [
  "{ai} can fake empathy. you do the real thing for peanuts. respect.",
]);

// ───────────────────────────────────────────────────────────────────────────
// TIER LEVEL (LEVEL 3 fallback): reacts to the cooked percentage itself
// ───────────────────────────────────────────────────────────────────────────

add("tier", LOW, [
  "{pct}% cooked. barely toasted. you're good, chief.",
  "respectfully, you picked correctly. who gave you the cheat code?",
  "not cooked. the algorithm likes you. don't tell the others.",
  "everyone else is panicking and you're just... fine. annoying, honestly.",
  "your future looks bright. your group chat is jealous and also needs your notes.",
  "{pct}%? that's room temperature. go touch grass, you've earned it.",
]);
add("tier", MID, [
  "{pct}% cooked: medium rare. edible, with seasoning (a good internship).",
  "half cooked is the 'it depends' of careers. so, it depends.",
  "not doomed, not thriving. just 'buffering' with decent wifi.",
  "the vibes say 'proceed, but bring a backup plan'.",
  "you're in the 'it's complicated' phase with your career.",
  "{pct}%: could go either way, which is weird because you're usually told which way.",
]);
add("tier", HIGH, [
  "{pct}% cooked: well done. someone call the waiter.",
  "this is the 'maybe i should've listened to my cousin' tier.",
  "your career is on the stove and the smoke alarm is LinkedIn notifications.",
  "you're not finished, you're 'in a transitional phase'.",
  "the future is unclear. also not great. mostly the second one.",
  "it's giving 'unemployed, but with extra steps'.",
]);
add("tier", EXTREME, [
  "{pct}% cooked. at this point you're a charcoal briquette with a degree.",
  "it's over. it's so over. someone put a candle on the diploma.",
  "we're finished. the group chat is holding a moment of silence.",
  "ain't no way. {pct}%?? the job market took one look and left.",
  "absolutely cooked. full 'smoke alarm in the hallway' cooked.",
  "congratulations, you've reached the final boss and it's the economy.",
  "{pct}% cooked. at this point just open a bakery.",
]);

