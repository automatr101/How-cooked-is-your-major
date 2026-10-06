// SERVER ONLY. The paid report's building blocks. Keep this file out of any "use client" component:
// importing it into the browser would put the paid content in the page for everyone.
//
// Content is grouped by the broad family of the major (the same families the roast engine uses), and the
// generator mixes it with the major's own name, score, pay and growth figures.

import type { GroupId } from "@/lib/roast/types";

export type Pair = [title: string, why: string];

export interface GroupContent {
  /** What this field's work looks like, in plain words. Used in the overview. */
  work: string;
  /** Tasks AI already does well in this field. */
  atRisk: string[];
  /** Tasks that stay human. */
  staysHuman: string[];
  strongPaths: Pair[];
  vulnerablePaths: Pair[];
  skills: Pair[];
  tools: Pair[];
  projects: Pair[];
  internship: string[];
  positioning: string[];
}

export const GROUPS: Record<GroupId | "general", GroupContent> = {
  stem: {
    work: "building, measuring and explaining how things work",
    atRisk: ["Writing routine code and scripts", "Cleaning and summarising datasets", "Drafting standard lab or technical reports", "Looking up methods and formulas"],
    staysHuman: ["Choosing which problem is worth solving", "Judging whether a result can be trusted", "Working with real equipment, sites and messy data", "Explaining findings to people who must act on them"],
    strongPaths: [
      ["Applied roles that use AI as a tool", "Companies need people who can point AI at real problems in your field and check its work."],
      ["R&D and technical product roles", "Judgement about what to build next is hard to automate."],
      ["Data and systems integration", "Someone has to connect the models to the instruments, databases and processes."],
      ["Technical sales and solutions", "People who understand both the technology and the customer stay valuable."],
    ],
    vulnerablePaths: [
      ["Entry-level scripting and reporting", "The first drafts of code and reports are exactly what AI now produces in seconds."],
      ["Pure data entry or data cleaning", "Automated pipelines are replacing manual preparation."],
      ["Template-based documentation", "Standard write-ups can be generated and only need review."],
    ],
    skills: [
      ["Python and SQL basics", "The shared language for data, automation and checking AI output."],
      ["Statistics and experimental thinking", "Lets you tell a real result from a confident-sounding guess."],
      ["Data visualisation", "Turns analysis into something decision-makers act on."],
      ["Git and reproducible work", "Shows your work can be repeated and trusted."],
      ["Technical writing", "Clear explanations are the part that gets you promoted."],
      ["Depth in one sub-field", "Specialists beat generalists when AI handles the basics."],
    ],
    tools: [
      ["ChatGPT or Claude", "Explain unfamiliar code, draft analysis, and review your own work."],
      ["GitHub Copilot", "Speeds up routine code so you spend time on design."],
      ["Jupyter or Google Colab", "A free place to run and share analysis."],
      ["Perplexity or Elicit", "Find and summarise papers and sources quickly."],
      ["NotebookLM", "Turn your course notes and papers into something you can question."],
      ["Power BI or Tableau", "Build dashboards that employers recognise."],
    ],
    projects: [
      ["Reproduce a published result", "Take a paper or public dataset, rebuild the analysis, and write what held up and what did not."],
      ["A public-data dashboard", "Pick open data from a government or research source and build a dashboard that answers one clear question."],
      ["Automate one repetitive task", "Find a routine job in your field, script it, and record the time saved."],
      ["A plain-language explainer", "Explain one technical idea for a non-technical reader, with a worked example."],
    ],
    internship: [
      "Apply to roles that name the problem (\"data analyst intern\", \"research assistant\") instead of waiting for your exact title.",
      "Lead with one project link and one number (hours saved, accuracy gained) before your grades.",
      "Email lab heads and team leads directly with a two-line note about a specific piece of their work.",
      "Say you use AI tools on purpose and check their output. That is now a hiring signal.",
    ],
    positioning: [
      "Present yourself as the person who gets reliable answers from AI, not the person competing with it.",
      "Name a specific domain you are strong in, not just \"STEM\".",
      "Show judgement: a short note on a time you caught a mistake in automated output.",
    ],
  },

  health: {
    work: "caring for people, with decisions that carry real consequences",
    atRisk: ["Paperwork, coding and routine documentation", "First-pass reading of scans or results", "Looking up guidelines and drug information", "Scheduling and patient messaging"],
    staysHuman: ["Hands-on care and examination", "Hard conversations and consent", "Judgement when the case does not fit the textbook", "Trust, which patients give to people"],
    strongPaths: [
      ["Frontline and clinical practice", "Care that needs a person in the room is the least exposed work there is."],
      ["Health technology and informatics", "Hospitals need clinicians who can shape and check the systems they use."],
      ["Public health and programme delivery", "Turning evidence into action across communities is a people job."],
      ["Specialist and community roles", "Under-served areas and niches keep demand steady."],
    ],
    vulnerablePaths: [
      ["Medical coding and transcription", "These are already among the most automated tasks."],
      ["Routine screening and triage reading", "AI assists here first, which can reduce the number of entry roles."],
      ["Back-office administration", "Scheduling and records are being streamlined."],
    ],
    skills: [
      ["Clinical reasoning under uncertainty", "The core skill that tools support but do not replace."],
      ["Communication and bedside manner", "Patients remember how you made them feel."],
      ["Health data literacy", "Understanding the numbers behind decisions and the tools that produce them."],
      ["Evidence appraisal", "Spotting weak studies and unreliable AI answers."],
      ["Leadership and teamwork", "Where senior roles open up."],
      ["A growing specialty", "Pick an area with rising demand, such as geriatrics, mental health or digital health."],
    ],
    tools: [
      ["ChatGPT or Claude", "Explain a concept in three ways, quiz you, and draft patient-friendly wording. Always verify against guidelines."],
      ["OpenEvidence or UpToDate", "Evidence lookup that is built for clinicians."],
      ["Anki", "Spaced repetition for the huge amount you have to remember."],
      ["NotebookLM", "Turn lecture notes and guidelines into something you can question."],
      ["Perplexity", "Quickly find sources, then read the primary ones yourself."],
      ["Ambient note-taking tools", "Learn how scribe tools work, since you will be asked to use them."],
    ],
    projects: [
      ["A patient education pack", "Write one-page explanations of three common conditions in plain language, reviewed by a supervisor."],
      ["A small audit or case study", "Pick one routine process, measure it, and suggest one improvement."],
      ["A guideline summary", "Summarise a current guideline with its evidence strength, in one page."],
      ["A community health talk", "Deliver or record a short session and collect feedback."],
    ],
    internship: [
      "Treat placements and shadowing as interviews: be the person staff ask back.",
      "Keep a log of cases and skills, with consent and no identifying details, to talk about concretely later.",
      "Ask about digital health or quality improvement teams. Few students do, so you stand out.",
      "Say you use AI to study and to save time on admin, and that you always verify.",
    ],
    positioning: [
      "Position yourself as safe hands who can also work with new tools.",
      "Pick a patient group or setting you care about and become known for it.",
      "Show you can explain things simply. It is rare and it is valued.",
    ],
  },

  commerce: {
    work: "moving money, people and decisions through organisations",
    atRisk: ["Preparing standard reports and reconciliations", "First drafts of emails, decks and proposals", "Basic financial modelling and data pulls", "Routine customer and admin queries"],
    staysHuman: ["Negotiation and building trust with clients", "Deciding under uncertainty with incomplete data", "Owning the outcome when something goes wrong", "Reading a room, a market or a person"],
    strongPaths: [
      ["Advisory and client-facing roles", "Trust and judgement are the product, and clients still want a person."],
      ["Strategy, operations and product", "Deciding what to do with the output is where the value moves."],
      ["Analytics and decision support", "Businesses need people who can ask the right question of the data."],
      ["Sales, partnerships and entrepreneurship", "Relationships and risk-taking are hard to automate."],
    ],
    vulnerablePaths: [
      ["Bookkeeping and routine reconciliation", "Rules-based work is the first to be automated."],
      ["Junior reporting and slide-building", "Drafts that took days now take minutes."],
      ["Generic marketing copy", "Mass-produced content is cheap, so only distinctive work earns more."],
    ],
    skills: [
      ["Excel and spreadsheet modelling", "Still the language of business, and what you use to check AI answers."],
      ["SQL and basic analytics", "Lets you answer your own questions."],
      ["Business writing and presenting", "Clear persuasion is a career multiplier."],
      ["Negotiation and stakeholder skills", "The human layer that decides who gets promoted."],
      ["Domain knowledge (finance, marketing, HR or supply chain)", "Context makes your use of AI useful."],
      ["Commercial judgement", "Knowing which numbers matter."],
    ],
    tools: [
      ["ChatGPT or Claude", "Draft, critique and stress-test proposals, then rewrite them in your own voice."],
      ["Excel with Copilot", "Faster analysis, with you checking the logic."],
      ["Power BI or Looker Studio", "Dashboards for decisions."],
      ["Notion or Airtable", "Organise projects and processes like a pro."],
      ["Perplexity", "Fast market and competitor research with sources."],
      ["Canva or Gamma", "Present results clearly without a design team."],
    ],
    projects: [
      ["A business case from public data", "Pick a real company, analyse it, and recommend one decision with the numbers behind it."],
      ["Automate a reporting task", "Turn a monthly report into a repeatable process and record the hours saved."],
      ["A small real business or campaign", "Run a tiny project with real customers, even for a society or a friend, and report the results."],
      ["A market teardown", "Compare three competitors and publish what you found."],
    ],
    internship: [
      "Target roles in analytics, operations or client teams, not only the title in your degree.",
      "Bring a one-page business case to interviews instead of just talking about your skills.",
      "Ask each manager what the team automated last year, and how people who adapted moved up.",
      "Build two or three relationships with working professionals before you apply.",
    ],
    positioning: [
      "Be the person who combines business sense with fluent use of AI tools.",
      "Own an outcome with numbers attached, not a list of duties.",
      "Pick an industry to be known for, such as fintech, health or agriculture.",
    ],
  },

  arts: {
    work: "creating things people feel and remember",
    atRisk: ["Stock imagery, generic copy and basic layouts", "First drafts, variations and resizing", "Routine editing and transcription", "Template-level design"],
    staysHuman: ["Taste: knowing what is good and why", "A distinctive voice and point of view", "Understanding a client or audience in person", "Direction, curation and finishing"],
    strongPaths: [
      ["Creative direction and brand", "Deciding what to make and why is worth more when making is cheap."],
      ["Experience, UX and product design", "Understanding people and context stays valuable."],
      ["Original voice: artist, writer, filmmaker", "An audience follows a person, not a prompt."],
      ["Hybrid roles using AI as a studio tool", "Faster iteration lets one person do a team's job."],
    ],
    vulnerablePaths: [
      ["Stock and commodity illustration", "Generated images undercut low-end work."],
      ["Generic copywriting and content farms", "Volume is no longer scarce."],
      ["Routine production work", "Resizing, cut-downs and basic edits are being automated."],
    ],
    skills: [
      ["Taste and critique", "Train it by studying great work and saying exactly why it works."],
      ["A clear personal style", "What makes someone hire you over a tool."],
      ["Storytelling", "Structure beats polish."],
      ["Client communication and pitching", "Winning and keeping work is half the job."],
      ["Motion, video or interactive basics", "Wider skill range means more ways to be paid."],
      ["Business basics for freelancers", "Pricing, contracts and getting paid."],
    ],
    tools: [
      ["Figma", "The standard for interface and brand work."],
      ["Midjourney or Firefly", "Rapid exploration. Use it for ideas, then make the final work yours."],
      ["ChatGPT or Claude", "Brainstorm angles and critique your drafts."],
      ["Canva or Adobe Express", "Quick delivery for clients."],
      ["CapCut or DaVinci Resolve", "Video skills that travel."],
      ["Notion", "Run your portfolio, clients and pipeline in one place."],
    ],
    projects: [
      ["A portfolio of three finished pieces with the story behind each", "Show the brief, the thinking, the drafts and the result."],
      ["A rebrand of a real local business", "Do it properly, present it, and ask for a testimonial."],
      ["A personal project in your own voice", "Something no tool could have made for you."],
      ["A before-and-after of your own AI-assisted workflow", "Proves you can use the tools without losing your hand."],
    ],
    internship: [
      "Apply with a link, not a CV: a small, sharp portfolio opens doors.",
      "Pitch studios and agencies with one specific idea for their work.",
      "Look at in-house teams in non-creative companies. They need design and content people.",
      "Be open that you use AI for exploration and always make the final work yourself.",
    ],
    positioning: [
      "Sell your taste and judgement, with the tools as a means.",
      "Pick a niche, such as music, food or sport, and become the person for it.",
      "Share your process publicly so people can see how you think.",
    ],
  },

  people: {
    work: "working with, for and between people",
    atRisk: ["Drafting standard documents, letters and summaries", "Researching precedent and background material", "Routine case notes and reporting", "First-line questions and information giving"],
    staysHuman: ["Trust, empathy and persuasion", "Judgement in situations that fit no rule", "Accountability and ethics", "Being in the room: courts, classrooms, communities"],
    strongPaths: [
      ["Advocacy, counselling and direct support", "People still want a person they can trust."],
      ["Policy, programme and community leadership", "Deciding and persuading are human acts."],
      ["Teaching, training and coaching", "Learners need guidance, motivation and feedback."],
      ["Legal, HR and compliance work with technology fluency", "Experts who can supervise AI are in demand."],
    ],
    vulnerablePaths: [
      ["Document review and routine drafting", "Standard text and large reviews are being automated."],
      ["Basic research and summary roles", "Finding and condensing material is fast with AI."],
      ["Generic administrative support", "Scheduling and standard replies are easy to automate."],
    ],
    skills: [
      ["Active listening and communication", "The base for every people-facing career."],
      ["Critical thinking and argument", "Lets you challenge AI output, not just accept it."],
      ["Ethics and professional judgement", "Where responsibility lies, and where AI cannot sit."],
      ["Research and evidence use", "Know which sources to trust."],
      ["Data literacy for your field", "Numbers and dashboards now sit in every policy and HR decision."],
      ["Facilitation and public speaking", "Leading rooms is a premium skill."],
    ],
    tools: [
      ["ChatGPT or Claude", "Draft, summarise and rehearse arguments. Verify every fact and source."],
      ["Perplexity", "Fast, cited background research."],
      ["NotebookLM", "Ask questions of your case files, readings and notes."],
      ["Notion or Obsidian", "Organise research and casework."],
      ["Zoom or Teams with transcription", "Capture meetings and follow up well."],
      ["Canva or Gamma", "Present clearly to non-specialists."],
    ],
    projects: [
      ["A policy or case brief", "Write a two-page brief on a live issue with sources and a clear recommendation."],
      ["A community or volunteer project with a result", "Organise something real and report what changed."],
      ["A mock negotiation, hearing or session, recorded", "Shows your skill beyond writing."],
      ["A plain-language guide", "Explain a complex process so that anyone could follow it."],
    ],
    internship: [
      "Choose placements where you speak to real people early, not only read files.",
      "Volunteer for the messy, human tasks. Those are the ones that lead to offers.",
      "Ask your supervisor how the team is using AI, and offer to help with it.",
      "Keep a record of cases handled and outcomes, with no confidential details.",
    ],
    positioning: [
      "Be the trustworthy human who also uses AI responsibly.",
      "Specialise early in one area, such as employment, education or family.",
      "Show you can handle responsibility: lead a project or a team.",
    ],
  },

  general: {
    work: "applying what you learned to real problems",
    atRisk: ["First drafts of writing and summaries", "Routine research and data lookups", "Basic analysis and spreadsheets", "Standard, rules-based tasks"],
    staysHuman: ["Judgement and accountability", "Trust and relationships", "Hands-on and in-person work", "Deciding what matters"],
    strongPaths: [
      ["Roles that combine your field with technology", "Fluency with AI tools plus real subject knowledge is hard to replace."],
      ["Client-facing and relationship roles", "Trust is earned by people."],
      ["Operations and coordination", "Making teams and systems work together stays valuable."],
      ["Entrepreneurship and freelancing", "AI lowers the cost of starting."],
    ],
    vulnerablePaths: [
      ["Entry-level routine analysis", "Standard reports are automated first."],
      ["Generic content and administration", "Volume work is cheap now."],
      ["Roles defined only by information lookup", "Search and summary are no longer scarce."],
    ],
    skills: [
      ["Clear writing and speaking", "Communication is the skill every employer names."],
      ["Data literacy", "Read, question and present numbers."],
      ["Problem solving", "Frame a messy problem and break it down."],
      ["Using AI tools well", "Prompting, checking and improving output."],
      ["Project and time management", "Delivering things reliably."],
      ["A specialist niche", "Depth sets you apart from the pile of general applicants."],
    ],
    tools: [
      ["ChatGPT or Claude", "A study partner and drafting assistant. Always check the facts."],
      ["Perplexity", "Research with sources."],
      ["NotebookLM", "Turn your notes into something you can question."],
      ["Notion", "Plan and track your projects and applications."],
      ["Canva or Gamma", "Present your work clearly."],
      ["Excel or Google Sheets", "The skill that never goes out of date."],
    ],
    projects: [
      ["A portfolio piece that solves a real problem", "Pick a local business or community need and show your work."],
      ["A research note on your field and AI", "Explain how AI affects your career area, with sources."],
      ["A small automation", "Make one boring task in your life or a society run itself."],
      ["A public write-up of what you learned", "A short post or video that shows how you think."],
    ],
    internship: [
      "Apply broadly to roles that use your skills, even if the title differs from your degree.",
      "Lead with one project and one result.",
      "Reach out directly to people two or three steps ahead of you.",
      "Mention you use AI tools thoughtfully. Employers want that now.",
    ],
    positioning: [
      "Tell one clear story about what you are good at and who it helps.",
      "Combine your degree with one other strength, such as data or communication.",
      "Show proof, not adjectives.",
    ],
  },
};

export const EMPLOYABILITY: string[] = [
  "Show work, not only grades: one strong project beats five listed modules.",
  "Get comfortable saying how you use AI, where you check it, and where you do not trust it.",
  "Build two or three real relationships with people in the field every term.",
  "Collect proof in numbers: hours saved, people helped, errors caught, money made.",
  "Keep learning in public: a short note on what you learned each month keeps you visible.",
];
