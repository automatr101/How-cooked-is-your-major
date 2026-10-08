import type { Metadata } from "next";
import { B, ContactBox, Ext, Int, LegalPage, P, Section, SITE_URL, UL } from "@/components/legal";

export const metadata: Metadata = {
  title: "Terms of Service | How Cooked Is Your Major?",
  description: "The terms for using How Cooked Is Your Major? and buying the Major Intelligence Career Plan.",
  alternates: {
    canonical: `${SITE_URL}/terms`,
  },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      current="/terms"
      intro={
        <>
          These Terms apply when you use <B>How Cooked Is Your Major?</B> at <Ext href={SITE_URL}>{SITE_URL.replace("https://", "")}</Ext> (the &ldquo;Site&rdquo;), run by MajorLabs Intelligence (&ldquo;we&rdquo;, &ldquo;us&rdquo;), and when you buy the Major Intelligence Career Plan (the &ldquo;Plan&rdquo;). By using the Site or buying the Plan you agree to them. If you do not agree, please do not use the Site.
        </>
      }
    >
      <Section n={1} title="What the Site Is">
        <P>
          The Site lets you look up a degree or major and see an estimated &ldquo;how cooked is it&rdquo; score for how exposed that field is to AI, with a roast, advice, salary and growth figures, a leaderboard, comparisons and shareable cards. These free tools are provided for information and entertainment.
        </P>
        <P>
          <B>Not professional advice.</B> The scores, levels, roasts, figures and the Plan are general estimates and opinions. They are not career, financial, academic, legal or other professional advice, and they are not tailored to your own grades, location, finances or goals. We do not guarantee any outcome, such as getting a job, a salary or a particular career path. Please do your own research and talk to qualified people before making important decisions.
        </P>
      </Section>

      <Section n={2} title="The Paid Career Plan">
        <UL>
          <li><B>What you get:</B> a written career plan for the major you choose, shown on the Site and available as a PDF download, delivered instantly after a successful payment. It is written for that major and its AI-risk level: it is general guidance for the major, not a personalised assessment of you.</li>
          <li><B>Price and currency:</B> the price is shown at checkout before you pay and is charged in Ghana cedis (GHS). If your card or mobile money account is in another currency, your bank or provider converts it and may add its own fees or use its own exchange rate, which we do not control. We may change the price at any time; a change applies only to later purchases.</li>
          <li><B>One-time payment:</B> there is no subscription and no automatic renewal.</li>
          <li><B>Your licence:</B> a purchase gives you a personal, non-transferable licence to read and keep the Plan for your own use. Please do not resell, publish, or share it publicly or in bulk.</li>
          <li><B>How access works:</B> your purchase is remembered by a cookie in the browser you paid with. If you use another device or clear your cookies, use &ldquo;Restore your plan&rdquo; in the checkout with your payment reference or the email you paid with. Access ends if the purchase is refunded.</li>
        </UL>
      </Section>

      <Section n={3} title="Payments">
        <P>
          Payments are processed by <Ext href="https://paystack.com">Paystack</Ext>, and your payment details are entered on its page and never reach us. Paystack&apos;s own terms apply to the payment itself. A payment is complete when the Site confirms it with Paystack; if you are charged but your Plan does not appear, use &ldquo;Restore your plan&rdquo; or contact us (see Section 10). Refunds are covered by our <Int href="/refunds">Refund Policy</Int>.
        </P>
      </Section>

      <Section n={4} title="Using the Site Fairly">
        <P>You agree not to:</P>
        <UL>
          <li>try to get the Plan or the PDF without paying, or interfere with how payments, unlocks or refunds work</li>
          <li>attack, overload, probe or disrupt the Site or its services, or use bots or scrapers to copy it in bulk</li>
          <li>use the Site for anything unlawful, to harass anyone, or to submit content that is abusive or includes other people&apos;s personal details</li>
          <li>use a payment method you are not allowed to use, or dispute a charge you know is valid</li>
        </UL>
        <P>We may block access or cancel a purchase (with a refund) if we reasonably think these rules are being broken.</P>
      </Section>

      <Section n={5} title="Content and Ownership">
        <P>
          The Site, its design, the scores and the Plan text are owned by MajorLabs Intelligence or its licensors and are protected by law. You may use the free tools and share your own result cards and links. Reviews, messages and feedback you send us may be used by us to run and improve the Site; please do not include personal details in them (see our <Int href="/privacy">Privacy Policy</Int>).
        </P>
      </Section>

      <Section n={6} title="Third-Party Services and Ads">
        <P>
          The Site shows ads (through Google AdSense) and links to other sites, and uses services such as Paystack and Google Analytics. We do not control them and are not responsible for their content or practices; their own terms and policies apply.
        </P>
      </Section>

      <Section n={7} title="Availability and Changes">
        <P>
          We try to keep the Site running but it is provided &ldquo;as is&rdquo;, so we cannot promise it will always be available or error-free. We may change, pause or remove features, and update these Terms. Changes are posted on this page with a new &ldquo;last updated&rdquo; date, and using the Site afterwards means you accept them. If we ever withdraw a Plan you have paid for, we will refund you.
        </P>
      </Section>

      <Section n={8} title="Disclaimers and Limits of Liability">
        <P>
          To the fullest extent the law allows, we give no warranties about the accuracy, completeness or fitness for a particular purpose of the Site or the Plan, and we are not liable for any loss caused by relying on them, or for indirect or consequential loss. Our total liability to you for anything related to the Site or the Plan is limited to the amount you paid us for the Plan in the 12 months before the claim. Nothing in these Terms limits any right you have by law that cannot be limited, or liability that cannot be excluded.
        </P>
      </Section>

      <Section n={9} title="Governing Law">
        <P>
          These Terms are governed by the laws of Ghana. If a dispute cannot be settled by talking to us first, the courts of Ghana will have jurisdiction, without taking away any protection you have under the mandatory laws of the country where you live.
        </P>
      </Section>

      <Section n={10} title="Contact">
        <P>Questions about these Terms, a payment or your Plan? Reach us here, and include your payment reference (it starts with &ldquo;cm-&rdquo;) if it is about a purchase:</P>
        <ContactBox />
      </Section>
    </LegalPage>
  );
}
