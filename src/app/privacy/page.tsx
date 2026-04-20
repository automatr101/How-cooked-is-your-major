import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | How Cooked Is Your Major?",
  description: "Privacy Policy for How Cooked Is Your Major? — learn how we handle your data, cookies, and third-party advertising.",
  alternates: {
    canonical: "https://how-cooked-is-your-major.vercel.app/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground pt-32 pb-24 px-6">
      <div className="max-w-3xl mx-auto space-y-10">

        {/* Header */}
        <div className="space-y-3">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">
            Last updated: April 20, 2026
          </p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter uppercase italic leading-none">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            This Privacy Policy explains how <strong>How Cooked Is Your Major?</strong> (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) collects, uses, and shares information when you visit our website at{" "}
            <a
              href="https://how-cooked-is-your-major.vercel.app"
              className="text-primary underline underline-offset-4"
            >
              how-cooked-is-your-major.vercel.app
            </a>{" "}
            (the &ldquo;Site&rdquo;).
          </p>
        </div>

        <hr className="border-border" />

        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-2xl font-black tracking-tighter uppercase">
            1. Information We Collect
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            We do <strong>not</strong> collect personally identifiable information (PII) such as your name, email address, or phone number. Our Site does not require account registration.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            We may collect non-personal, anonymised usage data automatically, including:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-4">
            <li>Browser type and version</li>
            <li>Device type (desktop, mobile, tablet)</li>
            <li>Pages visited and features used</li>
            <li>Referring URL</li>
            <li>Approximate geographic region (country/city level)</li>
            <li>Date and time of visit</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            This data is collected through third-party analytics tools (see Section 4) and is used solely to understand how users interact with the Site and improve our service.
          </p>
        </section>

        <hr className="border-border" />

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-2xl font-black tracking-tighter uppercase">
            2. Cookies
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Our Site uses cookies — small text files placed on your device — to improve your experience and enable advertising. Cookies we use include:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground pl-4">
            <li>
              <strong className="text-foreground">Essential Cookies:</strong> Required for basic site functionality, such as remembering your theme preference (dark/light mode).
            </li>
            <li>
              <strong className="text-foreground">Analytics Cookies:</strong> Set by Google Analytics to help us understand how visitors use our Site. These cookies collect anonymised information.
            </li>
            <li>
              <strong className="text-foreground">Advertising Cookies:</strong> Set by Google AdSense to serve relevant advertisements. These cookies may track your browsing activity across sites that use Google advertising.
            </li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            You can control cookies through your browser settings. Note that disabling certain cookies may affect site functionality. For more information on managing cookies, visit{" "}
            <a
              href="https://www.aboutcookies.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-4"
            >
              aboutcookies.org
            </a>
            .
          </p>
        </section>

        <hr className="border-border" />

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-2xl font-black tracking-tighter uppercase">
            3. Google AdSense &amp; Advertising
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            We use <strong>Google AdSense</strong> to display advertisements on our Site. Google AdSense is a service provided by Google LLC. Google may use cookies and similar tracking technologies to serve ads based on your prior visits to our Site and other websites on the internet.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Google&apos;s use of advertising cookies enables it and its partners to serve ads to you based on your visit to our Site and/or other sites on the internet.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            You may opt out of personalised advertising by visiting{" "}
            <a
              href="https://www.google.com/settings/ads"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-4"
            >
              Google Ads Settings
            </a>
            . You can also opt out via the{" "}
            <a
              href="https://optout.networkadvertising.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-4"
            >
              Network Advertising Initiative opt-out page
            </a>
            .
          </p>
          <p className="text-muted-foreground leading-relaxed">
            For more information on how Google uses data when you use our Site, please visit:{" "}
            <a
              href="https://policies.google.com/technologies/partner-sites"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-4"
            >
              How Google uses data from sites that use Google services
            </a>
            .
          </p>
        </section>

        <hr className="border-border" />

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-2xl font-black tracking-tighter uppercase">
            4. Google Analytics
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            We use <strong>Google Analytics</strong> to analyse Site usage and improve user experience. Google Analytics collects anonymised data about how visitors interact with the Site. This data is processed by Google and is subject to{" "}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-4"
            >
              Google&apos;s Privacy Policy
            </a>
            .
          </p>
          <p className="text-muted-foreground leading-relaxed">
            You can opt out of Google Analytics by installing the{" "}
            <a
              href="https://tools.google.com/dlpage/gaoptout"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-4"
            >
              Google Analytics Opt-out Browser Add-on
            </a>
            .
          </p>
        </section>

        <hr className="border-border" />

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="text-2xl font-black tracking-tighter uppercase">
            5. How We Use Your Information
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            The non-personal data we collect is used to:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-4">
            <li>Monitor and analyse Site performance and usage</li>
            <li>Improve the content and features of the Site</li>
            <li>Display relevant advertisements through Google AdSense</li>
            <li>Ensure security and prevent abuse</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            We do <strong>not</strong> sell, trade, or rent your personal data to third parties.
          </p>
        </section>

        <hr className="border-border" />

        {/* Section 6 */}
        <section className="space-y-3">
          <h2 className="text-2xl font-black tracking-tighter uppercase">
            6. Third-Party Links
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Our Site may contain links to third-party websites (e.g., Twitter/X, WhatsApp). We are not responsible for the privacy practices of those sites. We encourage you to read their privacy policies before providing any personal information.
          </p>
        </section>

        <hr className="border-border" />

        {/* Section 7 */}
        <section className="space-y-3">
          <h2 className="text-2xl font-black tracking-tighter uppercase">
            7. Children&apos;s Privacy
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Our Site is not directed to children under the age of 13. We do not knowingly collect personal information from children. If you believe a child has provided us with personal data, please contact us so we can remove it.
          </p>
        </section>

        <hr className="border-border" />

        {/* Section 8 */}
        <section className="space-y-3">
          <h2 className="text-2xl font-black tracking-tighter uppercase">
            8. Changes to This Policy
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated date. Continued use of the Site after any changes constitutes acceptance of the updated policy.
          </p>
        </section>

        <hr className="border-border" />

        {/* Section 9 */}
        <section className="space-y-3">
          <h2 className="text-2xl font-black tracking-tighter uppercase">
            9. Contact Us
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            If you have any questions or concerns about this Privacy Policy, you can reach us at:
          </p>
          <div className="bg-card border border-border rounded-2xl p-6 space-y-1">
            <p className="font-black text-foreground">MajorLabs Intelligence</p>
            <p className="text-muted-foreground text-sm">
              Website:{" "}
              <a
                href="https://how-cooked-is-your-major.vercel.app"
                className="text-primary underline underline-offset-4"
              >
                how-cooked-is-your-major.vercel.app
              </a>
            </p>
            <p className="text-muted-foreground text-sm">
              Twitter/X:{" "}
              <a
                href="https://twitter.com/cookedlabs_cto"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-4"
              >
                @cookedlabs_cto
              </a>
            </p>
          </div>
        </section>

      </div>
    </main>
  );
}
