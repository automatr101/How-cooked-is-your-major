"use client";

import { cn } from "@/lib/utils";
import { Lightbulb, Target, ShieldCheck, Zap, TrendingUp, AlertTriangle } from "lucide-react";

interface RecommendationsProps {
  score: number;
  majorName: string;
}

export function Recommendations({ score, majorName }: RecommendationsProps) {
  // Plain, a bit dry, and concrete: what to actually do. Same voice as the roast above it, minus the jokes.
  const getTips = () => {
    if (score >= 67) {
      return [
        {
          icon: <Zap className="text-destructive" />,
          title: "Learn the tool that's replacing you",
          text: `Find the AI tool people in ${majorName} already use at work and get good at it this month. The person who runs it beats the person it replaces.`
        },
        {
          icon: <Target className="text-orange-500" />,
          title: "Find the part a bot can't sign",
          text: "Look for the work where a human has to be accountable: sign-offs, client calls, anything with a licence or a lawsuit attached."
        },
        {
          icon: <ShieldCheck className="text-emerald-500" />,
          title: "Build a thing, not a transcript",
          text: "One real project, internship or paying client beats another line on your CV. Show people what you can do, not just where you studied."
        }
      ];
    } else if (score >= 34) {
      return [
        {
          icon: <AlertTriangle className="text-orange-500" />,
          title: "Audit your week",
          text: `Write down what a ${majorName} job actually does all day. Anything repetitive is next in line, so learn to automate it before someone else does.`
        },
        {
          icon: <Zap className="text-emerald-500" />,
          title: "Be the one who checks the AI",
          text: "Learn enough of the tech around your field to catch the AI's mistakes. Reviewing the output is a job. Getting reviewed by it isn't."
        },
        {
          icon: <Target className="text-emerald-500" />,
          title: "Aim at decisions",
          text: "Roles that decide, sell or explain hold up better than roles that only produce. Move toward them early."
        }
      ];
    } else {
      return [
        {
          icon: <TrendingUp className="text-emerald-500" />,
          title: "You're ahead. Use it.",
          text: `Demand for ${majorName} is holding up. Spend the head start getting really good, not comfortable.`
        },
        {
          icon: <Zap className="text-emerald-500" />,
          title: "Make AI your intern",
          text: "Hand it the boring drafts, summaries and spreadsheets. Spend the hours you save on the work only you can do."
        },
        {
          icon: <Lightbulb className="text-orange-500" />,
          title: "Check back",
          text: "A low score today isn't a permanent shield. Scan again in six months. Jobs change faster than degrees."
        }
      ];
    }
  };

  const tips = getTips();

  // Three cards in a row that swipes sideways (one and a bit visible on a phone, two and a bit wider up, so it is obvious
  // there is more), instead of three tall blocks stacked down the page.
  return (
    <div className="w-full mt-8">
      <h3 className="mb-3 px-1 text-xs font-black uppercase tracking-[0.4em] text-muted-foreground">What you can do</h3>
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        {tips.map((tip, i) => (
          <div key={i} className={cn("w-[78%] shrink-0 snap-start rounded-2xl border border-border/50 bg-card/40 p-4 backdrop-blur-xl sm:w-[46%]")}>
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-background p-1.5 shrink-0 [&_svg]:h-4 [&_svg]:w-4">{tip.icon}</div>
              <h4 className="text-[13px] font-black uppercase leading-tight text-foreground">{tip.title}</h4>
            </div>
            <p className="mt-2 text-[13px] leading-snug text-muted-foreground">{tip.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
