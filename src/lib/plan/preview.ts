// SERVER ONLY. The free taste of the paid plan: TWO real career recommendations taken straight from the plan the buyer
// would get for this major (same generator, same text), plus real counts of what else is inside. Nothing here is written
// by hand for the preview, and the rest of the plan never leaves the server: the counts are numbers, not text, so the
// "blurred" rows on the paywall carry no real wording that someone could read in the page source.

import type { Major } from "@/lib/data";
import { buildPlan } from "./generate";

export interface PlanPreview {
  planName: string;
  /** Two recommendations, exactly as they appear in the paid plan. */
  visible: { title: string; why: string }[];
  /** How many of each there are in the full plan. */
  counts: {
    careerPaths: number;
    riskyPaths: number;
    skills: number;
    aiTools: number;
    projects: number;
    roadmapSteps: number;
    internshipTips: number;
  };
}

export function previewOf(major: Major): PlanPreview {
  const plan = buildPlan(major);
  return {
    planName: plan.planName,
    visible: plan.strongPaths.slice(0, 2),
    counts: {
      careerPaths: plan.strongPaths.length,
      riskyPaths: plan.vulnerablePaths.length,
      skills: plan.skills.length,
      aiTools: plan.aiTools.length,
      projects: plan.projects.length,
      roadmapSteps: plan.roadmap.reduce((n, r) => n + r.steps.length, 0),
      internshipTips: plan.internship.length,
    },
  };
}
