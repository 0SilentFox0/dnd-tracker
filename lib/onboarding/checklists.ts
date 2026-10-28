import type { DmFacts, OnboardingStep, PlayerFacts } from "@/lib/onboarding/types";

const dm = (campaignId: string, path: string) => `/campaigns/${campaignId}/dm/${path}`;

export const DM_STEPS: OnboardingStep<DmFacts>[] = [
  { id: "races", href: (c) => dm(c, "races"), helpSlug: "dm-world", isDone: (f) => f.races > 0 },
  { id: "units", href: (c) => dm(c, "units"), helpSlug: "dm-units-balance", isDone: (f) => f.units > 0 },
  { id: "players", href: (c) => `/campaigns/${c}#invite`, helpSlug: "dm-quickstart", isDone: (f) => f.players > 0 },
  {
    id: "characters",
    href: (c) => dm(c, "characters"),
    helpSlug: "dm-quickstart",
    variant: (f) => (f.pendingDrafts > 0 ? { name: "pending", params: { count: f.pendingDrafts } } : undefined),
    isDone: (f) => f.activePlayerCharacters > 0,
  },
  { id: "battle-prepare", href: (c) => dm(c, "battles"), helpSlug: "dm-battle", isDone: (f) => f.battles > 0 },
  { id: "battle-run", href: (c) => dm(c, "battles"), helpSlug: "dm-battle", isDone: (f) => f.battlesStarted > 0 },
  { id: "scenario", href: (c) => dm(c, "scenario"), helpSlug: "dm-scenario-show", optional: true, isDone: (f) => f.scenarioPages > 0 },
  { id: "show", href: (c) => dm(c, "show"), helpSlug: "dm-scenario-show", optional: true, isDone: (f) => f.decks > 0 },
  { id: "music", href: (c) => dm(c, "music"), helpSlug: "dm-battle", optional: true, isDone: (f) => f.tracks > 0 },
  { id: "ai", href: () => "/settings/ai", helpSlug: "dm-ai", optional: true, isDone: (f) => f.aiKeys > 0 },
];

export const PLAYER_STEPS: OnboardingStep<PlayerFacts>[] = [
  {
    id: "character",
    href: (c) => `/campaigns/${c}/character`,
    helpSlug: "player-quickstart",
    variant: (f) => (f.ownCharacter === "pending" ? { name: "pending" } : undefined),
    isDone: (f) => f.ownCharacter === "active",
  },
  { id: "sheet", href: (c) => `/campaigns/${c}/character`, helpSlug: "player-quickstart", isDone: (f) => f.sheetSeen || f.joinedBattle },
  { id: "battle", helpSlug: "player-battle", isDone: (f) => f.joinedBattle },
  { id: "show", href: (c) => `/campaigns/${c}/show`, optional: true, informational: true, isDone: () => false },
];
