import { Metadata } from 'next';
import HomeClient from './HomeClient';

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const major = params.major as string;
  const score = params.score as string;
  const level = params.level as string;

  if (major && score) {
    const title = `I'm ${score}% Cooked (${major})`;
    const description = `Survival Status: ${level.toUpperCase()}. Check how cooked your major is at MajorLabs Intelligence.`;
    const ogUrl = `https://cooked-major.vercel.app/api/og?major=${encodeURIComponent(major)}&score=${score}&level=${encodeURIComponent(level)}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: 'https://cooked-major.vercel.app',
        siteName: 'How Cooked Is Your Major?',
        images: [
          {
            url: ogUrl,
            width: 1200,
            height: 630,
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
      },
      other: {
        'google-adsense-account': 'ca-pub-6100632094350229',
      },
      alternates: {
        canonical: 'https://cooked-major.vercel.app',
      },
    };
  }

  return {
    title: "How Cooked Is Your Major? | AI Risk Scan",
    description: "Check if AI is coming for your degree. Get roasted and survival advice.",
    openGraph: {
      title: "How Cooked Is Your Major? | AI Risk Scan",
      description: "Check if AI is coming for your degree. Get roasted and survival advice.",
      images: ['/og-image.png'], // You can add a default one later
    },
    twitter: {
      card: 'summary_large_image',
      title: "How Cooked Is Your Major? | AI Risk Scan",
      description: "Check if AI is coming for your degree. Get roasted and survival advice.",
      images: ['/og-image.png'],
    },
  };
}

export default function Page() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "How Cooked Is Your Major?",
    "description": "Find out how cooked your major is before graduation. AI risk assessment for students.",
    "url": "https://cooked-major.vercel.app",
    "applicationCategory": "EducationalApplication",
    "genre": "Education",
    "browserRequirements": "Requires JavaScript",
    "softwareVersion": "1.0.4",
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
