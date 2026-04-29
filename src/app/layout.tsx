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
    images: [{ url: "https://how-cooked-is-your-major.vercel.app/api/og?v=1" }],
    siteName: "How Cooked Is Your Major?",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "How Cooked Is Your Major? | AI Risk Scan",
    description: "Check if AI is coming for your degree. Scan 1,800+ majors, get roasted, and get survival advice.",
    images: ["https://how-cooked-is-your-major.vercel.app/api/og?v=1"],
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
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-F4BCS70GXP');
          `}
        </Script>
        {/* Google AdSense */}
        <Script
          id="google-adsense"
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9378010048800128"
          crossOrigin="anonymous"
          strategy="afterInteractive"
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
