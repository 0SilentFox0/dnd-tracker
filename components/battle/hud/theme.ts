import type { SpellTier } from "@/lib/utils/battle/view";

export const SIDE_COLOR = { ally: "#6f8fb0", enemy: "#9c2a1d" } as const;

export const metalClass = (tier: SpellTier) => `metal-${tier}`;
