import { type SpellTier, spellTier } from "@/lib/utils/battle/view";

export type { SpellTier };

export const metalClass = (tier: SpellTier) => `metal-${tier}`;

export const spellLevelMetal = (level: number) => metalClass(spellTier(level));

export const BRANCH_LEVEL_METAL = { basic: "metal-bronze", advanced: "metal-silver", expert: "metal-gold" } as const;

export const CIRCLE_METAL = { outer: BRANCH_LEVEL_METAL.basic, middle: BRANCH_LEVEL_METAL.advanced, inner: BRANCH_LEVEL_METAL.expert } as const;
