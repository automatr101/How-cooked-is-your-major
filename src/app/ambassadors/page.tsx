import type { Metadata } from "next";
import { headers } from "next/headers";
import { B, ContactBox, Int, LegalPage, P, Section, SITE_URL, UL } from "@/components/legal";
import { AmbassadorSignup } from "@/components/ambassador-signup";
import { ambassadorsEnabled, commissionOf, COMMISSION_PERCENT, HOLD_DAYS, money, REF_DAYS } from "@/lib/ambassadors/store";
import { regularPriceForPage } from "@/lib/payments/price";

export const metadata: Metadata = {
  title: "Campus Ambassadors | How Cooked Is Your Major?",
  description: `Share your link on campus and earn ${COMMISSION_PERCENT}% of every Survival Plan bought through it.`,
  alternates: { canonical: `${SITE_URL}/ambassadors` },
};
export const dynamic = "force-dynamic";

export default async function AmbassadorsPage() {
  // Vercel tells us the visitor's country: a Ghanaian campus as the example in Ghana, a famous one everywhere else
  const country = (await headers()).get("x-vercel-ip-country")?.toUpperCase();
  const campusExample = country === "GH" ? "KNUST" : "Harvard";
  // What one sale earns at the normal price, in each currency the plan is sold in
  const prices = [regularPriceForPage(false), regularPriceForPage(true)].filter((p, i, all) => all.findIndex((q) => q.currency === p.currency) === i);
  const perSale = prices.map((p) => `${money(commissionOf(p.minor), p.currency)} on a ${p.label} plan`).join(", or ");

  return (
    <LegalPage
      title="Campus Ambassadors"
      current="/ambassadors"
      intro={
        <>
          Your whole department is wondering how cooked their degree is. Be the one with the link. The scan is <B>free</B> for everyone you send.
          When someone you sent buys the optional Survival Plan, <B>you get {COMMISSION_PERCENT}% of what they paid</B>: {perSale}.
        </>
      }
    >
      <AmbassadorSignup enabled={ambassadorsEnabled()} campusExample={campusExample} />

      <Section n={1} title="How It Works">
        <UL>
          <li>Sign up below and get your own link. It looks like {SITE_URL.replace("https://", "")}/?ref=yourname-x7k2.</li>
          <li>Share it: class group chats, your status, your department page, a poster with a QR code.</li>
          <li>
            Anyone who opens your link and buys a plan within {REF_DAYS} days, on the same phone or browser, counts as your sale. If they open another
            ambassador&apos;s link after yours, the last link counts.
          </li>
          <li>Your private stats page shows your visits, your sales and what you have earned, as it happens.</li>
        </UL>
      </Section>

      <Section n={2} title="Getting Paid">
        <UL>
          <li>You earn {COMMISSION_PERCENT}% of the amount each buyer actually paid (a discounted plan earns {COMMISSION_PERCENT}% of the discounted price).</li>
          <li>We email you to arrange payment by mobile money or bank transfer. We never ask for a password or a PIN.</li>
          <li>
            Each sale becomes payable {HOLD_DAYS} days after it happens, once the <Int href="/refunds">7-day guarantee</Int> has run out. Until then it shows as
            pending. A refunded sale earns nothing.
          </li>
        </UL>
      </Section>

      <Section n={3} title="The Rules">
        <UL>
          <li>Your own purchases do not count.</li>
          <li>No spam: no mass-messaging strangers, no posting your link in places that ban it, no fake accounts.</li>
          <li>Don&apos;t promise anything we don&apos;t: the scan is entertainment, not career advice, and the plan guarantees no job or salary.</li>
          <li>No fake reviews, no made-up numbers, and no ads that use our name without asking us first.</li>
          <li>Breaking a rule pauses your link, and sales that came from breaking it are not paid.</li>
          <li>
            We can change the rate or end the program by updating this page. Anything you already earned before a change is still yours. Paid-plan sales
            are the only thing that earns: free scans, emails and shares do not.
          </li>
        </UL>
      </Section>

      <Section n={4} title="Your Data">
        <P>
          We keep your name, email and campus to run the program and pay you, and we count visits to your link. We don&apos;t store payment details. You can
          leave any time and ask us to delete your data through the <Int href="/contact">contact page</Int>. More in our <Int href="/privacy">Privacy Policy</Int>.
        </P>
      </Section>

      <Section n={5} title="Questions">
        <ContactBox />
      </Section>
    </LegalPage>
  );
}
