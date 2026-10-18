import { canonicalMajor, majors, type Major } from "@/lib/data";
import { slugify } from "@/lib/analytics";

/** A major by its slug (what the leads table stores), or null. If that name has since become an alias, its canonical major. */
export function majorBySlug(slug: string): Major | null {
  const row = majors.find((m) => slugify(m.name) === slug);
  return row ? (canonicalMajor(row.name) ?? row) : null;
}
