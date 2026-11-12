import type { Metadata } from "next";
import { scansLocked } from "@/lib/unlock/locked";
import { QuizClient } from "./quiz-client";

export const metadata: Metadata = {
  title: "Cooked or Cap? | How Cooked Is Your Major?",
  description: "Ten daily questions on degrees and jobs. True or cap. Share your score.",
};

export default async function Page() {
  return <QuizClient locked={await scansLocked()} />;
}
