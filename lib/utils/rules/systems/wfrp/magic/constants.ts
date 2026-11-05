import type { SpellMagicKind } from "@/lib/utils/spells/model/schema";

// verify against 5e book
export const CAST_SKILL = { key: "language", spec: "magick" } as const;
// verify against 5e book
export const OVERCAST_SL_STEP = 2;
// verify against 5e book
export const ARMOUR_SL_PER_AP = 1;
// verify against 5e book
export const CHANNEL_MAX_SL = 10;
// verify against 5e book
export const NO_OVERCAST_KINDS: ReadonlySet<SpellMagicKind> = new Set(["petty", "blessing", "miracle"]);
// verify against 5e book
export const PRAY_SKILL = { key: "pray" } as const;
// verify against 5e book
export const PRAYER_KINDS: ReadonlySet<SpellMagicKind> = new Set(["blessing", "miracle"]);
// verify against 5e book
export const WRATH_SIN_MAX = 10;
