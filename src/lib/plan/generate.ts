// SERVER ONLY. Builds the paid report for one major. Called by /api/plan after the unlock cookie has been
// checked, never from the browser.

import type { Major } from "@/lib/data";
import { analyze } from "@/lib/roast/names";
import { PLAN_COPY, planTypeFor, type PlanType } from "@/lib/premium";
import { slugify } from "@/lib/analytics";
import { EMPLOYABILITY, GROUPS, type Pair } from "./content";
import type { Plan } from "./types";

const toItems = (pairs: Pair[]) => pairs.map(([title, why]) => ({ title, why }));

function exposureLabel(score: number): string {
  return score >= 85 ? "Very high" : score >= 70 ? "High" : score >= 55 ? "Elevated" : score >= 40 ? "Moderate" : score >= 20 ? "Low" : "Very low";
}

/** Short phrase for a skill title without its explanatory brackets. */
const short = (s: string) => s.replace(/\s*\(.*\)\s*$/, "");

interface Frame {
  overview: (v: V) => string;
  whyScore: (v: V) => string;
  outlook: (v: V) => string;
  roadmap: (v: V) => Plan["roadmap"];
  conclusion: (v: V) => string;
}

interface V {
  name: string;
  nick: string;
  score: number;
  work: string;
  skill1: string;
  skill2: string;
  skill3: string;
  tool1: string;
  tool2: string;
  project1: string;
  project2: string;
  salary: string;
  growth: string;
  jobs: string | null;
}

const FRAMES: Record<PlanType, Frame> = {
  uncooking: {
    overview: (v) => `${v.name} scores ${v.score}% on our AI-risk scale. That is the high end: a lot of the entry-level work in ${v.nick} is the kind AI already does well. This plan is about changing your position before that reaches you. You move from doing the tasks AI can do to supervising, checking and directing them, and into the parts of ${v.nick} that need a person.`,
    whyScore: (v) => `A score of ${v.score}% means a large share of everyday ${v.nick} work, ${v.work}, can be drafted, summarised or analysed by current tools. The score measures exposure of tasks, not your worth or your future. The people who lose ground are the ones who keep doing the exposed tasks the old way.`,
    outlook: (v) => `In our data, ${v.nick} pays ${v.salary} and shows ${v.growth}. Expect fewer junior roles that are only routine output, and more demand for people who combine ${v.nick} knowledge with AI fluency. The market rewards those who move early.`,
    roadmap: (v) => [
      { days: 30, theme: "Stop the bleeding", steps: [
        `List the ten tasks you or your field do most often. Mark each one AI can already do, can help with, or cannot do.`,
        `Start using ${v.tool1} and ${v.tool2} daily for real study or work, and keep notes on where they are wrong.`,
        `Pick one adjacent skill to add first: ${v.skill1}.`,
        `Tell two people in the field you are moving toward the AI-assisted side of ${v.nick}, and ask what they would learn first.`,
      ] },
      { days: 60, theme: "Build proof", steps: [
        `Start the first portfolio piece: ${v.project1}.`,
        `Work on ${v.skill2} for at least three hours a week, and use the project to practise it.`,
        `Finish one visible project and write a short account of what you did, how you used AI and where you checked it.`,
        `Ask for feedback from someone working in the field and improve the piece.`,
      ] },
      { days: 90, theme: "Pivot into position", steps: [
        `Add a second piece: ${v.project2}.`,
        `Rewrite your CV and profile around results and the roles you now target, not around the list of modules.`,
        `Apply or reach out to ten specific people or teams, ${v.jobs ? `including ones hiring ${v.jobs} who now need someone with AI skills` : "including teams that now need someone with AI skills"}.`,
        `Review your plan. Keep what worked, drop what did not, and set the next 90 days.`,
      ] },
    ],
    conclusion: (v) => `${v.score}% is a warning, and it is also a head start for anyone who acts on it. Most people with a degree in ${v.nick} will read the headlines and wait. If you follow even half of this plan, you will be one of the ones who moved while it was still cheap to move. Start with the 30-day list this week.`,
  },

  future_proof: {
    overview: (v) => `${v.name} scores ${v.score}%, in the middle of our scale. Parts of ${v.nick} are exposed and parts are not. That is a good position, if you use it. This plan is about finding exactly which parts of your work AI will reach first and putting yourself on the right side of that line while there is time.`,
    whyScore: (v) => `A score of ${v.score}% means some everyday ${v.nick} work, ${v.work}, can be sped up or partly done by current tools, while other parts still depend on judgement, trust and presence. Your exposure sits in specific tasks, which means you can plan around it.`,
    outlook: (v) => `In our data, ${v.nick} pays ${v.salary} and shows ${v.growth}. Expect the routine parts of the job to get faster and cheaper, and the human parts to be worth more. People who learn to use the tools well will be the ones who do the work of two.`,
    roadmap: (v) => [
      { days: 30, theme: "Map your exposure", steps: [
        `List the tasks in your field and mark which AI helps with, which it could replace, and which it cannot touch.`,
        `Start using ${v.tool1} and ${v.tool2} for real work and note what they get right and wrong.`,
        `Choose the skill that protects you most: ${v.skill1}.`,
        `Find three people a few steps ahead of you and ask how their work has changed in the last year.`,
      ] },
      { days: 60, theme: "Add the layer AI cannot do", steps: [
        `Start a project that shows judgement, not only output: ${v.project1}.`,
        `Practise ${v.skill2} and ${v.skill3} through that project.`,
        `Write down how you used AI on it, what you changed, and why.`,
        `Share the work with someone in the field and use their feedback.`,
      ] },
      { days: 90, theme: "Own the AI-assisted version of your role", steps: [
        `Add a second piece: ${v.project2}.`,
        `Update your CV and profile so that they describe results and the tools you use, not just modules.`,
        `Apply for roles or placements that sit at the edge of ${v.nick} and technology, and ask directly how AI is used there.`,
        `Review and set the next 90 days, adding one deeper specialty.`,
      ] },
    ],
    conclusion: (v) => `You are not cooked. ${v.score}% is not a verdict, and it gives you the thing most people lack: time and a choice. Use it to build the skills that keep you on the safe side as the tools improve. Start the 30-day list this week, and re-scan in six months to see how the picture changes.`,
  },

  advantage: {
    overview: (v) => `${v.name} scores ${v.score}%, which is on the safe end of our scale. A lot of the work in ${v.nick} depends on people, judgement and presence, which tools do not replace. But low risk is a starting point, and everyone else in your field has it too. This plan shows you how to turn that position into a real, lasting lead.`,
    whyScore: (v) => `A score of ${v.score}% means most of the core of ${v.nick}, ${v.work}, rests on things AI handles badly: trust, accountability, physical presence and decisions without clean data. Safe today does not mean safe forever, and it does not mean advanced. It means you can build.`,
    outlook: (v) => `In our data, ${v.nick} pays ${v.salary} and shows ${v.growth}. The biggest gains will go to people in safe fields who also use AI well, because they can do more with the same hours than their peers.`,
    roadmap: (v) => [
      { days: 30, theme: "Raise your baseline", steps: [
        `Start using ${v.tool1} and ${v.tool2} daily so that you save hours you can spend on deeper work.`,
        `Pick the skill that widens your lead most: ${v.skill1}.`,
        `Write down what you want to be known for in ${v.nick}, in one sentence.`,
        `Find three people at the top of your field and read or watch what they have published.`,
      ] },
      { days: 60, theme: "Create visible leverage", steps: [
        `Start a project that shows your depth: ${v.project1}.`,
        `Work on ${v.skill2} and ${v.skill3} through it.`,
        `Document the project in public, with the results and what you learned.`,
        `Ask someone senior to review it and listen to what they say is missing.`,
      ] },
      { days: 90, theme: "Compound your lead", steps: [
        `Add a second piece: ${v.project2}.`,
        `Take on one responsibility that others avoid, such as leading a project, a presentation or a team.`,
        `Apply for the strongest placements and roles in your field, with proof and numbers in your application.`,
        `Review and set the next 90 days, adding one specialty that few people in your field have.`,
      ] },
    ],
    conclusion: (v) => `${v.score}% gives you a strong start. What turns it into an advantage is what you do with the next ninety days: the proof you build, the people you meet and the tools you learn while others wait. Begin with the 30-day list this week, and revisit this plan every quarter.`,
  },
};

export function buildPlan(major: Major): Plan {
  const planType = planTypeFor(major.score);
  const info = analyze(major.name);
  const g = GROUPS[info.group ?? "general"];
  const slug = slugify(major.name);
  const jobs = info.disc?.pools.jobs?.[0] ?? null;

  const v: V = {
    name: major.name,
    nick: info.nick,
    score: major.score,
    work: g.work,
    skill1: short(g.skills[0][0]),
    skill2: short(g.skills[1][0]),
    skill3: short(g.skills[2][0]),
    tool1: short(g.tools[0][0]),
    tool2: short(g.tools[1][0]),
    project1: g.projects[0][0].toLowerCase(),
    project2: g.projects[1][0].toLowerCase(),
    salary: major.salary,
    growth: major.growth,
    jobs,
  };

  const frame = FRAMES[planType];
  const exposure = exposureLabel(major.score);

  // A discipline can add the specific jobs most exposed to the vulnerable list
  const vulnerable = toItems(g.vulnerablePaths);
  if (jobs && planType !== "advantage") {
    vulnerable.unshift({ title: `Entry-level ${jobs}`, why: "The most routine part of this work is where AI is already being used first, so fewer junior openings are likely." });
  }

  return {
    planType,
    planName: PLAN_COPY[planType].name,
    major: { name: major.name, slug, score: major.score, level: major.level, salary: major.salary, growth: major.growth },
    overview: frame.overview(v),
    whyScore: frame.whyScore(v),
    aiExposure: {
      label: exposure,
      summary: `${exposure} exposure. This is about tasks, not people: ${planType === "advantage" ? "your core work leans on things AI does badly" : planType === "future_proof" ? "some of your work is exposed and some is protected" : "much of the routine work is already within reach of current tools"}.`,
      atRisk: g.atRisk,
      staysHuman: g.staysHuman,
    },
    outlook: frame.outlook(v),
    strongPaths: toItems(g.strongPaths),
    vulnerablePaths: vulnerable.slice(0, 4),
    skills: toItems(g.skills),
    aiTools: toItems(g.tools),
    projects: toItems(g.projects),
    internship: g.internship,
    positioning: g.positioning,
    roadmap: frame.roadmap(v),
    employability: EMPLOYABILITY,
    conclusion: frame.conclusion(v),
  };
}
