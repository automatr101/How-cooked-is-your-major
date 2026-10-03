import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ContactForm } from "@/components/contact-form";

export const metadata: Metadata = {
  title: "Contact | How Cooked Is Your Major?",
  description: "Send feedback, report a wrong score or ask a question.",
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-background text-foreground font-sans px-4 pt-6 sm:p-6 md:p-12 pb-24">
      <div className="max-w-xl mx-auto space-y-8">
        <div className="space-y-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Return Home
          </Link>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter uppercase italic leading-none">
            Get in <span className="text-primary underline decoration-destructive decoration-wavy underline-offset-4">touch</span>
          </h1>
          <p className="text-muted-foreground font-medium text-lg">
            Feedback, a score that looks wrong, or a business question? Send it here.
          </p>
        </div>
        <ContactForm />
      </div>
    </main>
  );
}
