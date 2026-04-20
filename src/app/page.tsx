import { Metadata } from 'next';
import HomeClient from './HomeClient';

const SITE_URL = 'https://how-cooked-is-your-major.vercel.app';

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const major = params.major as string;
  const score = params.score as string;
  const level = params.level as string;

  if (major && score) {
    const title = `${major} is ${level} — ${score}% AI Risk`;
    const description = `Survival Status: ${level.toUpperCase()}. Check how cooked your major is at MajorLabs Intelligence.`;
    // Add v=1 to force re-crawl
    const ogUrl = `${SITE_URL}/api/og?major=${encodeURIComponent(major)}&score=${score}&level=${encodeURIComponent(level)}&v=1`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `${SITE_URL}?major=${encodeURIComponent(major)}&score=${score}&level=${encodeURIComponent(level)}`,
        siteName: 'How Cooked Is Your Major?',
        images: [
          {
            url: ogUrl,
            width: 1200,
            height: 630,
            alt: `${major} — ${score}% AI Risk`,
          },
        ],
        locale: 'en_US',
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogUrl],
        site: '@cookedlabs_cto',
        creator: '@cookedlabs_cto',
      },
      other: {
        'google-adsense-account': 'ca-pub-9378010048800128',
      },
      alternates: {
        canonical: SITE_URL,
      },
    };
  }

  // Default metadata (homepage, no major selected)
  const defaultOgUrl = `${SITE_URL}/api/og?v=1`;
  return {
    title: "How Cooked Is Your Major? | AI Risk Scan",
    description: "Check if AI is coming for your degree. Scan 1,800+ majors, get roasted, and get survival advice.",
    openGraph: {
      title: "How Cooked Is Your Major? | AI Risk Scan",
      description: "Check if AI is coming for your degree. Scan 1,800+ majors, get roasted, and get survival advice.",
      url: SITE_URL,
      siteName: 'How Cooked Is Your Major?',
      images: [
        {
          url: defaultOgUrl,
          width: 1200,
          height: 630,
          alt: 'How Cooked Is Your Major?',
        },
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: "How Cooked Is Your Major? | AI Risk Scan",
      description: "Check if AI is coming for your degree. Scan 1,800+ majors, get roasted, and get survival advice.",
      images: [defaultOgUrl],
      site: '@cookedlabs_cto',
      creator: '@cookedlabs_cto',
    },
    other: {
      'google-adsense-account': 'ca-pub-9378010048800128',
    },
    alternates: {
      canonical: SITE_URL,
    },
  };
}

export default function Page() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "How Cooked Is Your Major?",
    "description": "Find out how cooked your major is before graduation. AI risk assessment for students.",
    "url": SITE_URL,
    "applicationCategory": "EducationalApplication",
    "genre": "Education",
    "browserRequirements": "Requires JavaScript",
    "softwareVersion": "1.0.5",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeClient />
    </>
  );
}
