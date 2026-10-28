export const SPELL_GROUP_ICON_KEYS = ["moon", "flame", "sparkles", "sun", "shell", "shield", "portal", "eye", "heart", "mask", "skull", "vortex"] as const;

export type SpellGroupIconKey = (typeof SPELL_GROUP_ICON_KEYS)[number];

export const SPELL_GROUP_FALLBACK_COLOR = "#6d7177";
