import { majors, type Major } from "@/lib/data";
import { slugify } from "@/lib/analytics";

/** A major by its slug (what the leads table stores), or null. */
export function majorBySlug(slug: string): Major | null {
  return majors.find((m) => slugify(m.name) === slug) ?? null;
}
