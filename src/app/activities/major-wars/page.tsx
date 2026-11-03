import type { Metadata } from "next";
import { scansLocked } from "@/lib/unlock/locked";
import { WarsClient } from "./wars-client";

export const metadata: Metadata = {
  title: "Major Wars | How Cooked Is Your Major?",
  description: "Two degrees, one vote a day: which is more cooked? See what the scan says and how everyone else voted.",
};

export default async function Page() {
  return <WarsClient locked={await scansLocked()} />;
}
