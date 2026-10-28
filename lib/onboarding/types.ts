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
  joinedBattle: boolean;
}

export type OnboardingFacts = { role: "dm"; dm: DmFacts } | { role: "player"; player: PlayerFacts };

export interface StepVariant {
  name: string;
  params?: Record<string, number>;
}

export interface OnboardingStep<F> {
  id: string;
  href?: (campaignId: string) => string;
  helpSlug?: string;
  optional?: boolean;
  informational?: boolean;
  variant?: (facts: F) => StepVariant | undefined;
  isDone: (facts: F) => boolean;
}

export interface OnboardingHintDef {
  id: string;
  audience: OnboardingRole;
  helpSlug?: string;
}

export interface WhatsNewEntry {
  id: string;
  date: string;
  audience: OnboardingAudience;
  href?: string;
}

export type HelpBlockDef = { kind: "p" } | { kind: "list"; count: number } | { kind: "link"; href: string };

export interface HelpArticleDef {
  slug: string;
  audience: OnboardingAudience;
  sections: { blocks: HelpBlockDef[] }[];
}

export type ChecklistState = "open" | "collapsed" | "hidden";

export type OnboardingFlags = Record<string, string | null>;
