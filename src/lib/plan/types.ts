// The shape of the paid report. Types only, so the browser can import this without pulling in the content.

import type { PlanType } from "@/lib/premium";

export interface Plan {
  planType: PlanType;
  planName: string;
  major: { name: string; slug: string; score: number; level: string; salary: string; growth: string };
  overview: string;
  whyScore: string;
  aiExposure: { label: string; summary: string; atRisk: string[]; staysHuman: string[] };
  outlook: string;
  strongPaths: { title: string; why: string }[];
  vulnerablePaths: { title: string; why: string }[];
  skills: { title: string; why: string }[];
  aiTools: { title: string; why: string; url?: string }[];
  /** Real occupations this major leads to, with US median pay and outlook from O*NET (U.S. Department of Labor). */
  careers: { title: string; pay: string; outlook: string; where: string; url: string }[];
  /** Where the career figures come from, shown with them. */
  careersSource: string;
  /** Free places to learn, with links. */
  learn: { title: string; url: string; why: string }[];
  /** Job searches already filled in for the first career. */
  jobSearch: { title: string; url: string }[];
  projects: { title: string; why: string }[];
  internship: string[];
  positioning: string[];
  roadmap: { days: 30 | 60 | 90; theme: string; steps: string[] }[];
  employability: string[];
  conclusion: string;
}
