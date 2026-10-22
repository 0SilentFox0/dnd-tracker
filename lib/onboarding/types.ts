export type OnboardingRole = "dm" | "player";

export type OnboardingAudience = OnboardingRole | "all";

export interface DmFacts {
  races: number;
  units: number;
  players: number;
  activePlayerCharacters: number;
  pendingDrafts: number;
  battles: number;
  battlesStarted: number;
  scenarioPages: number;
  decks: number;
  tracks: number;
  aiKeys: number;
}

export interface PlayerFacts {
  ownCharacter: "none" | "pending" | "active";
  sheetSeen: boolean;
  inActiveBattle: boolean;
}

export type OnboardingFacts = { role: "dm"; dm: DmFacts } | { role: "player"; player: PlayerFacts };

export interface OnboardingStep<F> {
  id: string;
  title: string;
  description: string | ((facts: F) => string);
  href: (campaignId: string) => string;
  helpSlug?: string;
  optional?: boolean;
  informational?: boolean;
  isDone: (facts: F) => boolean;
}

export interface OnboardingHintDef {
  id: string;
  audience: OnboardingRole;
  title: string;
  body: string;
  helpSlug?: string;
}

export interface WhatsNewEntry {
  id: string;
  date: string;
  audience: OnboardingAudience;
  title: string;
  body: string;
  href?: string;
}

export type HelpBlock = { kind: "p"; text: string } | { kind: "list"; items: string[] } | { kind: "link"; text: string; href: string };

export interface HelpArticle {
  slug: string;
  audience: OnboardingAudience;
  title: string;
  summary: string;
  sections: { heading: string; blocks: HelpBlock[] }[];
}

export type ChecklistState = "open" | "collapsed" | "hidden";

export type OnboardingFlags = Record<string, string | null>;
