import type { ShowcaseId } from "@/components/landing/media";
import type { LANDING_LOCALES } from "@/lib/constants/site";

export type Locale = (typeof LANDING_LOCALES)[number];

export interface Cta {
  label: string;
  href: string;
}

export interface Showcase {
  id: ShowcaseId;
  eyebrow: string;
  title: string;
  text: string;
  points: string[];
  alt: string;
  screen: string;
}

export interface DemoCopy {
  windowTitle: string;
  tokens: { wizard: string; dwarf: string; bard: string; goblin: string; orc: string; owlbear: string };
  check: string;
  logCaster: string;
  logText: string;
  music: string;
  phone: { role: string; slots: string; spells: [string, string, string] };
  stepsLabel: string;
}

export interface AiMockCopy {
  pageTitle: string;
  pageText: string;
  newSceneLabel: string;
  newSceneText: string;
  pageTail: string;
  panelTitle: string;
  userMessage: string;
  reply: string;
  proposal: string;
  accept: string;
  reject: string;
}

export interface LandingCopy {
  locale: Locale;
  meta: { title: string; description: string; keywords: string[] };
  nav: { aria: string; items: Cta[]; signIn: string; signUp: string; myCampaigns: string; switchTo: string; switchLabel: string };
  hero: { eyebrow: string; titleLead: string; titleAccent: string; text: string; primary: string; member: string; secondary: Cta; note: string; alt: string };
  problem: { eyebrow: string; title: string; pains: string[]; resolve: string; replaces: { title: string; text: string }[]; hubTag: string };
  combat: {
    eyebrow: string;
    title: string;
    text: string;
    points: { title: string; text: string }[];
    demoSteps: string[];
    demo: DemoCopy;
    fx: { title: string; text: string; names: string[]; auras: string[]; more: string };
  };
  mechanics: { eyebrow: string; title: string; text: string; capabilities: { id: string; title: string; text: string }[]; templatesNote: string; footnote: string; alt: string };
  prep: { eyebrow: string; title: string; text: string; panels: Showcase[] };
  ai: Omit<Showcase, "id"> & { id: "ai"; honesty: string; mock: AiMockCopy };
  players: { eyebrow: string; title: string; text: string; panels: Showcase[] };
  how: { eyebrow: string; title: string; steps: { title: string; text: string }[] };
  faq: { eyebrow: string; title: string; items: { q: string; a: string }[] };
  cta: { title: string; text: string };
  footer: { navAria: string; tagline: string; credits: string; disclaimer: string; signIn: string; signUp: string };
}
