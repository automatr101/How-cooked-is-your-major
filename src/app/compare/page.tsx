import { scansLocked } from "@/lib/unlock/locked";
import CompareClient from "./compare-client";

// While the paid-unlock experiment runs, visitors can still pick two majors; the cards come back locked.
export default async function ComparePage() {
  return <CompareClient locked={await scansLocked()} />;
}
