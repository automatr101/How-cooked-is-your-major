import type { Metadata } from "next";
import { WordleClient } from "./wordle-client";

export const metadata: Metadata = {
  title: "Major Wordle | How Cooked Is Your Major?",
  description: "A new campus, degree and career word every day. Six tries. Share your grid.",
};

export default function Page() {
  return <WordleClient />;
}
