export const SPELL_GROUP_ICON_KEYS = ["moon", "flame", "sparkles", "sun", "shell"] as const;

export type SpellGroupIconKey = (typeof SPELL_GROUP_ICON_KEYS)[number];

export const SPELL_GROUP_FALLBACK_COLOR = "#6d7177";
