export type FxBadgeKey = "thorns" | "rust" | "raincloud" | "might" | "siphon" | "stoneskin";

export type FxBadgeLabels = Record<FxBadgeKey, string>;

/** The numbers drawn on the badges; the translated text takes them as `{value}`. */
export const FX_BADGE_VALUES = { thorns: 3, rust: 2, raincloud: 2, siphon: 25 } as const;

/** Used where no translated labels are passed (dev tools). */
export const DEFAULT_BADGE_LABELS: FxBadgeLabels = {
  thorns: `-${FX_BADGE_VALUES.thorns} attack`,
  rust: `-${FX_BADGE_VALUES.rust} AC`,
  raincloud: `-${FX_BADGE_VALUES.raincloud} morale`,
  might: "+attack",
  siphon: `-${FX_BADGE_VALUES.siphon}% damage`,
  stoneskin: "+AC",
};
