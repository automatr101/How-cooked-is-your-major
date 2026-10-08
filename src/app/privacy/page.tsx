import type { Metadata } from "next";
import { B, ContactBox, Ext, Int, LegalPage, P, Section, SITE_URL, UL } from "@/components/legal";

export const metadata: Metadata = {
  title: "Privacy Policy | How Cooked Is Your Major?",
  description: "How How Cooked Is Your Major? handles your data: what we collect, cookies, payments, who we share it with, and your choices.",
  alternates: {
    canonical: `${SITE_URL}/privacy`,
  },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      current="/privacy"
      intro={
        <>
          This Privacy Policy explains how <B>How Cooked Is Your Major?</B> (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;), run by MajorLabs Intelligence, collects, uses and shares information when you use our website at{" "}
          <Ext href={SITE_URL}>{SITE_URL.replace("https://", "")}</Ext> (the &ldquo;Site&rdquo;). The short version: you do not need an account, we collect as little as we can, and we never see or store your card or mobile money details.
        </>
      }
    >
      <Section n={1} title="What We Collect">
        <P>
          <B>Just visiting.</B> The free tools (searching a major, your score and roast, sharing, comparing, the leaderboard) need no account and ask for no name or email. We receive anonymised usage data automatically, through analytics tools (see Sections 4 and 5): browser type and version, device type, pages visited and features used, referring website, approximate location (country or city level) and date and time of visit.
        </P>
        <P>
          <B>What you type into the search box.</B> When you pick a result, or when nothing matches, the words you typed (cut to 60 characters) are recorded in our analytics so we can see which majors people look for. Please do not type personal details into the search box.
        </P>
        <P>
          <B>&ldquo;Where did you hear about us?&rdquo;</B> After a result we may ask where you found the site. You pick one answer from a fixed list; nothing you type is collected. The answer is recorded in our analytics.
        </P>
        <P>
          <B>Reviews, scan alerts and the contact form.</B> If you leave a star rating or a written review, we receive it as a private message through Telegram, along with your country, device type, browser and the major you scanned. Reviews are free text, so please do not include personal details such as your name, email address or phone number. We do not publish reviews. We also receive a short private alert through Telegram when someone scans a major, containing the major, country, device type, browser and referring website. If you write to us through the contact page, we receive your message and the name and email address you type, as a private message through Telegram, with your country, device type and browser. We use them only to read and reply to you, and we do not publish them. These alerts and messages never include your IP address.
        </P>
        <P>
          <B>Buying the paid career plan.</B> Payment is handled by our payment provider, <Ext href="https://paystack.com">Paystack</Ext>, on Paystack&apos;s own page. Your card or mobile money details are entered there and go straight to Paystack: we never see or store them. To start a payment we send Paystack the email address you type (used for your receipt) and the major you are buying for. After a successful payment we keep a purchase record containing: the payment reference, the major, the plan type, the amount and currency, Paystack&apos;s transaction number, the date, whether it was refunded, and a one-way cryptographic fingerprint of your email address. We use the fingerprint only so you can restore your plan by entering the email you paid with. We do not store your email address itself in our database, and we do not send it to analytics or to our alerts. Paystack keeps its own record of your payment under its own policy.
        </P>
        <P>
          <B>Our private alerts about payments.</B> When someone clicks the unlock button, starts a payment, completes or abandons one, or is refunded, we receive a private Telegram message with the major, the plan, the amount, the payment reference, and your country, device type and browser. It never contains your email address, name or IP address.
        </P>
        <P>
          <B>IP addresses.</B> We use your IP address only briefly, in memory, to limit abuse (for example to stop automated guessing), and we do not store it or send it anywhere. Our hosting provider and Google process IP addresses as part of running their services.
        </P>
      </Section>

      <Section n={2} title="Cookies and Similar Storage">
        <P>
          The Site uses cookies (small text files placed on your device) and similar browser storage. They fall into these groups:
        </P>
        <UL>
          <li>
            <B>Essential:</B> your light or dark theme and your sound on/off choice; and, only if you buy a plan or restore one, a signed unlock cookie (<code>cm_entitlement</code>) that tells the Site this browser has paid for that major. It is HttpOnly and lasts one year, so your plan is still there when you come back. You can delete it at any time; you can then restore your plan with your payment reference or the email you paid with.
          </li>
          <li>
            <B>Small reminders:</B> whether you already left a rating or chose &ldquo;maybe later&rdquo;, whether you already answered the &ldquo;where did you hear about us&rdquo; question, and, for the current tab only, which plans you opened. They stay in your own browser.
          </li>
          <li>
            <B>Analytics:</B> set by Google Analytics to help us understand how visitors use the Site (see Section 4).
          </li>
          <li>
            <B>Advertising:</B> set by Google AdSense to serve ads, which may track your browsing activity across sites that use Google advertising (see Section 5).
          </li>
        </UL>
        <P>
          You can control cookies through your browser settings; blocking some of them may stop parts of the Site working (for example, a blocked unlock cookie means you would have to restore your plan). For more on managing cookies, see{" "}
          <Ext href="https://www.aboutcookies.org">aboutcookies.org</Ext>.
        </P>
      </Section>

      <Section n={3} title="How We Use Information">
        <UL>
          <li>To run the Site and deliver the plan you paid for, including letting you restore it and download your PDF</li>
          <li>To process payments, send you a receipt (through Paystack), and handle refunds and support requests</li>
          <li>To understand how the Site is used, fix problems and improve it</li>
          <li>To show advertising through Google AdSense</li>
          <li>To keep the Site secure and prevent abuse and fraud</li>
        </UL>
        <P>
          We do <B>not</B> sell, trade or rent your personal data.
        </P>
      </Section>

      <Section n={4} title="Google Analytics">
        <P>
          We use <B>Google Analytics</B> to analyse Site usage and improve the experience. Google Analytics collects anonymised data about how visitors interact with the Site, which is processed by Google and is subject to{" "}
          <Ext href="https://policies.google.com/privacy">Google&apos;s Privacy Policy</Ext>. We send it events such as which major was scanned, whether a result was shared, and the steps of the buying process (for example &ldquo;unlock clicked&rdquo; and &ldquo;payment completed&rdquo;). We never send it your email address or name. You can opt out with the{" "}
          <Ext href="https://tools.google.com/dlpage/gaoptout">Google Analytics Opt-out Browser Add-on</Ext>.
        </P>
      </Section>

      <Section n={5} title="Google AdSense & Advertising">
        <P>
          We use <B>Google AdSense</B>, a service provided by Google LLC, to display advertisements. Google may use cookies and similar technologies to serve ads based on your prior visits to the Site and other websites, which enables it and its partners to show you relevant ads. You may opt out of personalised advertising in{" "}
          <Ext href="https://www.google.com/settings/ads">Google Ads Settings</Ext> or through the{" "}
          <Ext href="https://optout.networkadvertising.org">Network Advertising Initiative opt-out page</Ext>. More on how Google uses data from sites that use its services:{" "}
          <Ext href="https://policies.google.com/technologies/partner-sites">policies.google.com/technologies/partner-sites</Ext>.
        </P>
      </Section>

      <Section n={6} title="Who We Share Information With">
        <P>We use these service providers to run the Site. Each handles only what it needs to do its job:</P>
        <UL>
          <li><B>Paystack</B>: processes payments and refunds and sends your receipt. It receives your email, the amount and the major, and the payment details you enter on its page.</li>
          <li><B>Supabase</B>: stores our purchase records (described in Section 1), in a database hosted in the European Union (Ireland).</li>
          <li><B>Vercel</B>: hosts the Site and measures its speed and performance.</li>
          <li><B>Google</B>: Analytics and AdSense (Sections 4 and 5).</li>
          <li><B>Telegram</B>: delivers the private alerts, reviews and contact messages to us.</li>
        </UL>
        <P>
          We may also disclose information if the law requires it, or to protect the Site and its users from fraud or abuse. We do not sell your personal data.
        </P>
      </Section>

      <Section n={7} title="How Long We Keep It">
        <UL>
          <li><B>Analytics:</B> Google Analytics event data is kept for 14 months.</li>
          <li><B>Purchase records:</B> kept for as long as needed to provide your plan, support you, handle refunds and meet financial record-keeping duties.</li>
          <li><B>Reviews, contact messages and alerts:</B> kept in our private Telegram chat until we delete them.</li>
          <li><B>Unlock cookie:</B> one year, or until you delete it.</li>
        </UL>
      </Section>

      <Section n={8} title="Your Choices and Rights">
        <P>
          You can ask us what we hold about you, ask us to correct it, or ask us to delete it, by writing to us through the <Int href="/contact">contact page</Int>. For a purchase, include your payment reference (it starts with &ldquo;cm-&rdquo; and is on your receipt). If we delete a purchase record you will no longer be able to restore that plan, and Paystack and financial records we are required by law to keep will remain. You can also clear your cookies and browser storage at any time, opt out of analytics and personalised ads as described above, or use the Site&apos;s free tools without giving us any personal information.
        </P>
      </Section>

      <Section n={9} title="Security">
        <P>
          We take reasonable steps to protect information: the Site is served over HTTPS, payments happen on Paystack&apos;s secured page, the unlock cookie is signed and cannot be edited, the purchase database can only be reached by our server, and we keep your email address out of it. No system is perfectly secure, so we cannot guarantee absolute security.
        </P>
      </Section>

      <Section n={10} title="International Transfers">
        <P>
          Our providers operate in several countries, including the United States and the European Union, so information about your visit may be processed outside the country where you live. We choose established providers and, where the law requires, rely on their standard safeguards.
        </P>
      </Section>

      <Section n={11} title="Third-Party Links">
        <P>
          The Site may link to other websites (for example Twitter/X and WhatsApp when you share a result). We are not responsible for their privacy practices, so please read their policies.
        </P>
      </Section>

      <Section n={12} title="Children's Privacy">
        <P>
          The Site is not directed to children under 13. We do not knowingly collect personal information from children. If you believe a child has given us personal data, please contact us so we can remove it.
        </P>
      </Section>

      <Section n={13} title="Changes to This Policy">
        <P>
          We may update this policy from time to time. Changes are posted on this page with a new &ldquo;last updated&rdquo; date. Using the Site after a change means you accept the updated policy.
        </P>
      </Section>

      <Section n={14} title="Contact Us">
        <P>For questions about this policy or your information, reach us here:</P>
        <ContactBox />
      </Section>
    </LegalPage>
  );
}
