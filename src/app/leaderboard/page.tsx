import { scansLocked } from "@/lib/unlock/locked";
import { ScansLocked } from "@/components/unlock/scans-locked";
import LeaderboardClient from "./leaderboard-client";

export default async function LeaderboardPage() {
  if (await scansLocked()) return <ScansLocked title="The ranking is locked" />;
  return <LeaderboardClient />;
}
