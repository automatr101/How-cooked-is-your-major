import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { ThemeProvider } from "@/components/theme-provider";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Navbar } from "@/components/navbar";

export const metadata: Metadata = {
  title: "How Cooked Is Your Major? | AI Risk Scan",
  description: "Check if AI is coming for your degree. Scan 1,800+ majors, get roasted, and get survival advice.",
  metadataBase: new URL("https://how-cooked-is-your-major.vercel.app"),
  openGraph: {
    url: "https://how-cooked-is-your-major.vercel.app/",
    title: "How Cooked Is Your Major? | AI Risk Scan",
    description: "Check if AI is coming for your degree. Scan 1,800+ majors, get roasted, and get survival advice.",
    images: [{ url: "https://how-cooked-is-your-major.vercel.app/api/og?v=3" }],
    siteName: "How Cooked Is Your Major?",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "How Cooked Is Your Major? | AI Risk Scan",
    description: "Check if AI is coming for your degree. Scan 1,800+ majors, get roasted, and get survival advice.",
    images: ["https://how-cooked-is-your-major.vercel.app/api/og?v=3"],
    site: "@cookedlabs_cto",
    creator: "@cookedlabs_cto",
  },
  other: {
    "twitter:domain": "how-cooked-is-your-major.vercel.app",
    "twitter:url": "https://how-cooked-is-your-major.vercel.app/",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="google-adsense-account" content="ca-pub-9378010048800128" />
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-F4BCS70GXP"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            (function () {
              var ID = 'G-F4BCS70GXP';
              var KEY = 'cm_internal';
              var internal = false;
              try {
                // ?cm_internal=1 marks this browser as the owner's: its visits are tagged traffic_type=internal so GA4 can
                // leave them out. ?cm_internal=0 undoes it. The tag is removed from the address afterwards.
                var q = new URLSearchParams(location.search);
                var flag = q.get('cm_internal');
                if (flag === '1') localStorage.setItem(KEY, '1');
                if (flag === '0') localStorage.removeItem(KEY);
                if (flag !== null) {
                  q.delete('cm_internal');
                  var rest = q.toString();
                  history.replaceState(history.state, '', location.pathname + (rest ? '?' + rest : '') + location.hash);
                }
                internal = localStorage.getItem(KEY) === '1';
              } catch (e) {}
              // Nothing is sent from a developer's machine: it would only pollute the real numbers
              var h = location.hostname;
              if (h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || /\\.localhost$/.test(h)) window['ga-disable-' + ID] = true;
              window.dataLayer = window.dataLayer || [];
              window.gtag = function () { window.dataLayer.push(arguments); };
              window.gtag('js', new Date());
              window.gtag('config', ID, internal ? { traffic_type: 'internal' } : {});
            })();
          `}
        </Script>
        {/* Google AdSense */}
        <Script
          id="google-adsense"
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9378010048800128"
          crossOrigin="anonymous"
          strategy="lazyOnload"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased pt-20`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <Navbar />
          {children}
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
