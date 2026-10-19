import type { FxArchetype } from "./types";

export const IMPACT_MS: Record<FxArchetype, number> = { melee: 230, ranged: 380, bolt: 600, area: 650, heal: 450, buff: 400, debuff: 650, summon: 500, death: 0, swarm: 700, quake: 400, teleport: 300, entangle: 500, meteor: 700, eldritch: 520, slow: 650, haste: 350, stoneskin: 650, cleanse: 800, regenerate: 400, might: 700, deflect: 600, holyword: 750, empower: 700, spellward: 600, sunbeam: 650, retribution: 900, resurrect: 1100, siphon: 700, rust: 500, pestilence: 800, whispers: 500, thorns: 450, raincloud: 600, blindfold: 600, puppet: 700, netherhands: 700, firesummon: 900, watersummon: 900, earthsummon: 900, airsummon: 900, phoenix: 900, avatar: 900, healword: 700, healwave: 650, rebirth: 1200, forestspirit: 900, thornvines: 700, moonbeam: 650, vampire: 800 };

export const MAX_FX_BATCH = 6;

/** A broken animation is abandoned after this, so it never stalls the queue. */
export const MAX_FX_MS = 3000;
