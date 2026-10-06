// The shape of the paid report. Types only, so the browser can import this without pulling in the content.

import type { PlanType } from "@/lib/premium";

export interface Plan {
  planType: PlanType;
  /** Where the career paths, skills, tools and projects came from. Not shown to the buyer. */
  source: "generated" | "template";
  planName: string;
  major: { name: string; slug: string; score: number; level: string; salary: string; growth: string };
  overview: string;
  whyScore: string;
  aiExposure: { label: string; summary: string; atRisk: string[]; staysHuman: string[] };
  outlook: string;
  strongPaths: { title: string; why: string }[];
  vulnerablePaths: { title: string; why: string }[];
  skills: { title: string; why: string }[];
  aiTools: { title: string; why: string }[];
  projects: { title: string; why: string }[];
  internship: string[];
  positioning: string[];
  roadmap: { days: 30 | 60 | 90; theme: string; steps: string[] }[];
  employability: string[];
  conclusion: string;
}
