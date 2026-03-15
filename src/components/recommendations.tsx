"use client";

import { cn } from "@/lib/utils";
import { Lightbulb, Target, ShieldCheck, Zap, TrendingUp, AlertTriangle } from "lucide-react";

interface RecommendationsProps {
  score: number;
  majorName: string;
}

export function Recommendations({ score, majorName }: RecommendationsProps) {
  const getTips = () => {
    if (score >= 67) {
      return [
        {
          icon: <Zap className="text-destructive" />,
          title: "Learn AI-adjacent skills",
          text: `Master tools like specialized LLMs and automation workflows to bridge ${majorName} with the AI layer.`
        },
        {
          icon: <Target className="text-orange-500" />,
          title: "Explore pivot careers",
          text: "Look into high-complexity advisory roles or strategic implementation where human empathy is still mandatory."
        },
        {
          icon: <ShieldCheck className="text-emerald-500" />,
          title: "Double down on Human soft skills",
          text: "Negotiation, ethics, and physical high-stakes presence are the final frontiers AI can't conquer."
        }
      ];
    } else if (score >= 34) {
      return [
        {
          icon: <AlertTriangle className="text-orange-500" />,
          title: "Identify automatable tasks",
          text: `Audit your daily tasks for ${majorName} and automate them yourself before a machine does it for you.`
        },
        {
          icon: <Zap className="text-emerald-500" />,
          title: "Build tech-complementary skills",
          text: "Learn enough technical architecture to become the one who manages the AI agents in your field."
        },
        {
          icon: <Target className="text-emerald-500" />,
          title: "Shift to Strategy & Management",
          text: "Move away from technical execution and focus on high-level decision making and resource orchestration."
        }
      ];
    } else {
      return [
        {
          icon: <TrendingUp className="text-emerald-500" />,
          title: "Double Down",
          text: `Your field is expanding. Become a top 1% expert in ${majorName} while the market demand outpaces supply.`
        },
        {
          icon: <Zap className="text-emerald-500" />,
          title: "10x Your Productivity",
          text: "Adopt AI tools to handle the grunt work, allowing you to focus on the breakthroughs machines can't see."
        },
        {
          icon: <Lightbulb className="text-orange-500" />,
          title: "Stay Updated",
          text: "Low risk today isn't a permanent shield. Re-scan every 6 months to track emerging automation vectors."
        }
      ];
    }
  };

  const tips = getTips();

  return (
    <div className="w-full mt-8 bg-card/40 border border-border/50 rounded-3xl p-6 sm:p-8 backdrop-blur-xl">
      <h3 className="text-xs font-black uppercase tracking-[0.4em] text-muted-foreground mb-6">WHAT YOU CAN DO</h3>
      
      <div className="space-y-6">
        {tips.map((tip, i) => (
          <div key={i} className={cn(
            "flex items-start gap-4 pb-6",
            i !== tips.length - 1 && "border-b border-border/10"
          )}>
            <div className="p-2 bg-background rounded-xl shrink-0">
              {tip.icon}
            </div>
            <div>
              <h4 className="text-sm font-black uppercase text-foreground mb-1">{tip.title}</h4>
              <p className="text-muted-foreground text-sm leading-relaxed">{tip.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
