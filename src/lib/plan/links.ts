// SERVER ONLY. Real links the paid report points to: the official site of every AI tool it names, free places to learn, and job
// searches already filled in for the buyer's field. Only official homepages and search pages, no affiliate links, no tracking.

/** Official site for each tool name used in content.ts (a name like "Canva or Gamma" gets the first tool's site). */
export const TOOL_LINKS: Record<string, string> = {
  "ChatGPT or Claude": "https://chatgpt.com",
  "GitHub Copilot": "https://github.com/features/copilot",
  "Jupyter or Google Colab": "https://colab.research.google.com",
  "Perplexity or Elicit": "https://www.perplexity.ai",
  Perplexity: "https://www.perplexity.ai",
  NotebookLM: "https://notebooklm.google.com",
  "Power BI or Tableau": "https://powerbi.microsoft.com",
  "Power BI or Looker Studio": "https://powerbi.microsoft.com",
  Figma: "https://www.figma.com",
  "Canva or Adobe Express": "https://www.canva.com",
  "Canva or Gamma": "https://www.canva.com",
  "CapCut or DaVinci Resolve": "https://www.capcut.com",
  "Midjourney or Firefly": "https://firefly.adobe.com",
  Notion: "https://www.notion.so",
  "Notion or Airtable": "https://www.notion.so",
  "Notion or Obsidian": "https://www.notion.so",
  Anki: "https://apps.ankiweb.net",
  "OpenEvidence or UpToDate": "https://www.openevidence.com",
  "Excel or Google Sheets": "https://www.microsoft.com/microsoft-365/excel",
  "Excel with Copilot": "https://www.microsoft.com/microsoft-365/excel",
  "Zoom or Teams with transcription": "https://www.microsoft.com/microsoft-teams",
};

export interface LearnLink {
  title: string;
  url: string;
  why: string;
}

const AI_BASICS: LearnLink = { title: "AI For Everyone (Coursera, free to audit)", url: "https://www.coursera.org/learn/ai-for-everyone", why: "A short, non-technical course on what AI can and cannot do at work." };

/** Free places to learn, by family of majors. */
export const LEARN: Record<"stem" | "health" | "commerce" | "arts" | "people" | "general", LearnLink[]> = {
  stem: [
    { title: "Kaggle Learn", url: "https://www.kaggle.com/learn", why: "Free, hands-on Python, SQL and machine-learning lessons that run in the browser." },
    { title: "MIT OpenCourseWare", url: "https://ocw.mit.edu", why: "Real MIT course material, free, for going deeper in your own subject." },
    { title: "freeCodeCamp", url: "https://www.freecodecamp.org/learn", why: "Free coding and data courses with projects you can show." },
    AI_BASICS,
  ],
  health: [
    { title: "Khan Academy: Health and medicine", url: "https://www.khanacademy.org/science/health-and-medicine", why: "Free refreshers on physiology and disease to keep the basics sharp." },
    { title: "WHO Academy / OpenWHO", url: "https://openwho.org", why: "Free public-health courses from the World Health Organization." },
    { title: "Kaggle Learn: Intro to programming", url: "https://www.kaggle.com/learn", why: "Enough data skill to read and use health data, which few clinicians have." },
    AI_BASICS,
  ],
  commerce: [
    { title: "Google Career Certificates", url: "https://grow.google/certificates/", why: "Data analytics, project management and digital marketing, with financial aid available." },
    { title: "Microsoft Learn", url: "https://learn.microsoft.com/training/", why: "Free Excel, Power BI and Copilot training that employers recognise." },
    { title: "Khan Academy: Economics and finance", url: "https://www.khanacademy.org/economics-finance-domain", why: "Free, clear refreshers on the money side of business." },
    AI_BASICS,
  ],
  arts: [
    { title: "Figma: Learn design", url: "https://help.figma.com", why: "Free official Figma lessons, the tool most design jobs ask for." },
    { title: "Canva Design School", url: "https://www.canva.com/designschool/", why: "Free short courses on design basics, branding and video." },
    { title: "Google Digital Garage", url: "https://learndigital.withgoogle.com/digitalgarage", why: "Free digital-marketing courses to pair your craft with distribution." },
    AI_BASICS,
  ],
  people: [
    { title: "Coursera (audit for free)", url: "https://www.coursera.org", why: "University courses in psychology, law, education and social science, free to audit." },
    { title: "Khan Academy", url: "https://www.khanacademy.org", why: "Free refreshers in statistics and the basics your field builds on." },
    { title: "Google Career Certificates", url: "https://grow.google/certificates/", why: "Data analytics or project management: the hard skill that makes a people-field CV stand out." },
    AI_BASICS,
  ],
  general: [
    { title: "Coursera (audit for free)", url: "https://www.coursera.org", why: "University courses in almost any subject, free to audit." },
    { title: "Google Career Certificates", url: "https://grow.google/certificates/", why: "Job-ready certificates in data, IT, marketing and project management." },
    { title: "Khan Academy", url: "https://www.khanacademy.org", why: "Free refreshers in maths, statistics and writing." },
    AI_BASICS,
  ],
};

/** Job searches already filled in with the buyer's target role. */
export function jobSearches(role: string): { title: string; url: string }[] {
  const q = encodeURIComponent(role);
  return [
    { title: `LinkedIn Jobs: ${role}`, url: `https://www.linkedin.com/jobs/search/?keywords=${q}` },
    { title: `Indeed: ${role}`, url: `https://www.indeed.com/jobs?q=${q}` },
    { title: `Jobberman Ghana: ${role}`, url: `https://www.jobberman.com.gh/jobs?q=${q}` },
  ];
}
