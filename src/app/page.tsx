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
    const ogUrl = new URL('https://cooked-major.vercel.app/api/og');
    ogUrl.searchParams.set('major', major);
    ogUrl.searchParams.set('score', score);
    ogUrl.searchParams.set('level', level);

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [
          {
            url: ogUrl.toString(),
            width: 1200,
            height: 630,
            alt: `Cooked Analysis for ${major}`,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogUrl.toString()],
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
  return <HomeClient />;
}
