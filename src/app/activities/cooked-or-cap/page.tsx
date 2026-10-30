import type { Metadata } from "next";
import { QuizClient } from "./quiz-client";

export const metadata: Metadata = {
  title: "Cooked or Cap? | How Cooked Is Your Major?",
  description: "Ten daily questions on degrees and jobs. True or cap. Share your score.",
};

export default function Page() {
  return <QuizClient />;
}
