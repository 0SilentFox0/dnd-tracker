import type { FxArchetype } from "./types";

export const IMPACT_MS: Record<FxArchetype, number> = { melee: 230, ranged: 380, bolt: 600, area: 650, heal: 450, buff: 400, debuff: 650, summon: 500, death: 0 };

export const MAX_FX_BATCH = 6;
