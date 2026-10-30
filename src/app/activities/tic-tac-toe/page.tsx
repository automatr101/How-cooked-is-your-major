import type { Metadata } from "next";
import { TicTacToeClient } from "./tictactoe-client";

export const metadata: Metadata = {
  title: "Tic-Tac-Toe | How Cooked Is Your Major?",
  description: "Play Tic-Tac-Toe against the AI (easy or unbeatable), on one phone, or against a friend online.",
};

export default function Page() {
  return <TicTacToeClient />;
}
