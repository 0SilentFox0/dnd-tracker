import type { FxArchetype } from "./types";

export const IMPACT_MS: Record<FxArchetype, number> = { melee: 230, ranged: 380, bolt: 600, area: 650, heal: 450, buff: 400, debuff: 650, summon: 500, death: 0, swarm: 700, quake: 400, teleport: 300, entangle: 500, meteor: 700, eldritch: 520, slow: 650, haste: 350, stoneskin: 650 };

export const MAX_FX_BATCH = 6;

/** A broken animation is abandoned after this, so it never stalls the queue. */
export const MAX_FX_MS = 3000;
