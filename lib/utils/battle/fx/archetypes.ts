import type { FxArchetype } from "./types";

/** What the hit frame on a target shows: a damage frame, a heal frame, or none (the animation is the whole effect). */
export type FxImpactKind = "damage" | "heal" | "none";

export interface ArchetypeFx {
  /** When the animation lands on a target, from its start; the hit frame and shake wait this long. */
  impactMs: number;
  impact: FxImpactKind;
  /** The i-th target starts `i × staggerMs` later. */
  staggerMs?: number;
}

export const ARCHETYPE_FX: Record<FxArchetype, ArchetypeFx> = {
  melee: { impactMs: 230, impact: "damage" },
  ranged: { impactMs: 380, impact: "damage" },
  bolt: { impactMs: 600, impact: "damage" },
  area: { impactMs: 650, impact: "damage", staggerMs: 70 },
  heal: { impactMs: 450, impact: "heal" },
  buff: { impactMs: 400, impact: "none" },
  debuff: { impactMs: 650, impact: "none" },
  summon: { impactMs: 500, impact: "none" },
  death: { impactMs: 0, impact: "none" },
  swarm: { impactMs: 700, impact: "damage", staggerMs: 80 },
  quake: { impactMs: 400, impact: "damage", staggerMs: 50 },
  teleport: { impactMs: 300, impact: "none" },
  entangle: { impactMs: 500, impact: "none", staggerMs: 60 },
  meteor: { impactMs: 700, impact: "damage", staggerMs: 120 },
  eldritch: { impactMs: 520, impact: "damage" },
  slow: { impactMs: 650, impact: "none" },
  haste: { impactMs: 350, impact: "none" },
  stoneskin: { impactMs: 650, impact: "none" },
  cleanse: { impactMs: 800, impact: "none" },
  regenerate: { impactMs: 400, impact: "none" },
  might: { impactMs: 700, impact: "none" },
  deflect: { impactMs: 600, impact: "none" },
  holyword: { impactMs: 750, impact: "damage" },
  empower: { impactMs: 700, impact: "none" },
  spellward: { impactMs: 600, impact: "none" },
  sunbeam: { impactMs: 650, impact: "heal" },
  retribution: { impactMs: 900, impact: "damage" },
  resurrect: { impactMs: 1100, impact: "heal" },
  siphon: { impactMs: 700, impact: "none" },
  rust: { impactMs: 500, impact: "none" },
  pestilence: { impactMs: 800, impact: "damage" },
  whispers: { impactMs: 500, impact: "none" },
  thorns: { impactMs: 450, impact: "none" },
  raincloud: { impactMs: 600, impact: "none" },
  blindfold: { impactMs: 600, impact: "none" },
  puppet: { impactMs: 700, impact: "none" },
  netherhands: { impactMs: 700, impact: "damage" },
  firesummon: { impactMs: 900, impact: "none" },
  watersummon: { impactMs: 900, impact: "none" },
  earthsummon: { impactMs: 900, impact: "none" },
  airsummon: { impactMs: 900, impact: "none" },
  phoenix: { impactMs: 900, impact: "none" },
  avatar: { impactMs: 900, impact: "none" },
  healword: { impactMs: 700, impact: "heal" },
  healwave: { impactMs: 650, impact: "heal" },
  rebirth: { impactMs: 1200, impact: "heal", staggerMs: 120 },
  forestspirit: { impactMs: 900, impact: "none" },
  thornvines: { impactMs: 700, impact: "damage" },
  moonbeam: { impactMs: 650, impact: "damage" },
  vampire: { impactMs: 800, impact: "none" },
};

export const FX_ARCHETYPES = Object.keys(ARCHETYPE_FX) as FxArchetype[];
