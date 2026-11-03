import { scansLocked } from "@/lib/unlock/locked";
import { ScansLocked } from "@/components/unlock/scans-locked";
import CompareClient from "./compare-client";

export default async function ComparePage() {
  if (await scansLocked()) return <ScansLocked title="Compare is locked" />;
  return <CompareClient />;
}
