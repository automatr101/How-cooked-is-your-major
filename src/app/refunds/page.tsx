import type { Metadata } from "next";
import { B, ContactBox, Int, LegalPage, P, Section, SITE_URL, UL } from "@/components/legal";

export const metadata: Metadata = {
  title: "Refund Policy | How Cooked Is Your Major?",
  description: "When and how you can get a refund for the Major Intelligence Career Plan, and how long it takes.",
  alternates: {
    canonical: `${SITE_URL}/refunds`,
  },
};

export default function RefundsPage() {
  return (
    <LegalPage
      title="Refund Policy"
      current="/refunds"
      intro={
        <>
          The Major Intelligence Career Plan is a digital product that is delivered the moment you pay, so it cannot be &ldquo;returned&rdquo; like a physical item. We still want you to be treated fairly: <B>if something goes wrong, we will fix it or refund you.</B> This policy is part of our <Int href="/terms">Terms of Service</Int>.
        </>
      }
    >
      <Section n={1} title="When You Get a Full Refund">
        <UL>
          <li>You were charged but your Plan did not appear, and &ldquo;Restore your plan&rdquo; did not fix it</li>
          <li>You were charged more than once for the same Plan</li>
          <li>The Plan or its PDF will not open or download and we cannot fix it within a reasonable time</li>
          <li>The Plan is for the wrong major, or is missing sections that the offer said were included</li>
          <li>A charge was made without your authorisation (we will help investigate)</li>
        </UL>
      </Section>

      <Section n={2} title="If You Are Not Happy With the Plan">
        <P>
          Tell us <B>within 7 days of buying it</B> and say what was wrong. We read every request, and where the Plan clearly did not do what we said it would, we will refund you. Because the Plan is delivered instantly and cannot be handed back, we do not generally refund a purchase only because you changed your mind after reading it, or because the guidance is general advice for a major rather than tailored to you. Any right you have by law to cancel or to a remedy is not affected by this policy.
        </P>
      </Section>

      <Section n={3} title="How to Ask for a Refund">
        <P>
          Write to us through the <Int href="/contact">contact page</Int> and include your <B>payment reference</B> (it starts with &ldquo;cm-&rdquo; and is on your Paystack receipt) or the email you paid with, and a line about what happened. We aim to reply within 3 business days. Please contact us before disputing the charge with your bank, because we can usually sort it out faster.
        </P>
      </Section>

      <Section n={4} title="How Refunds Are Paid">
        <UL>
          <li>Refunds go back to the same card or mobile money account you paid with, through Paystack. We cannot refund to a different account.</li>
          <li>We aim to start an approved refund within 3 business days. After that it depends on your bank or mobile money provider, and can take several business days (often up to 10) to show up.</li>
          <li>You are refunded the full amount you were charged, in Ghana cedis. If your bank converted the payment to another currency, any difference caused by its exchange rate, and any fee your bank or provider added, is outside our control and is not included.</li>
        </UL>
      </Section>

      <Section n={5} title="What Happens to Your Access">
        <P>
          As soon as a refund is started, access to that Plan, on the Site and as a PDF, is removed, and &ldquo;Restore your plan&rdquo; no longer works for it. Please delete any copy you downloaded. If a refund fails for a technical reason, your access is put back; contact us and we will sort it out.
        </P>
      </Section>

      <Section n={6} title="Contact">
        <P>Questions about a payment or a refund? Reach us here:</P>
        <ContactBox />
      </Section>
    </LegalPage>
  );
}
