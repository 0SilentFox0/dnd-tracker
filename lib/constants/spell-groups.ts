export const SPELL_GROUP_ICON_KEYS = ["moon", "flame", "sparkles", "sun", "shell", "shield", "portal", "eye", "heart", "mask", "skull", "vortex"] as const;

export type SpellGroupIconKey = (typeof SPELL_GROUP_ICON_KEYS)[number];

export const SPELL_GROUP_FALLBACK_COLOR = "#6d7177";

export const SPELL_SCHOOLS = [
  { key: "abjuration", code: "A", name: "Abjuration", color: "#4a7bd0", icon: "shield" },
  { key: "conjuration", code: "C", name: "Conjuration", color: "#d08a2c", icon: "portal" },
  { key: "divination", code: "D", name: "Divination", color: "#c9b458", icon: "eye" },
  { key: "enchantment", code: "E", name: "Enchantment", color: "#d0569a", icon: "heart" },
  { key: "evocation", code: "V", name: "Evocation", color: "#d0432c", icon: "flame" },
  { key: "illusion", code: "I", name: "Illusion", color: "#8a5cd0", icon: "mask" },
  { key: "necromancy", code: "N", name: "Necromancy", color: "#5f8a3c", icon: "skull" },
  { key: "transmutation", code: "T", name: "Transmutation", color: "#2ca59a", icon: "vortex" },
] as const satisfies ReadonlyArray<{ key: string; code: string; name: string; color: string; icon: SpellGroupIconKey }>;

const PSIONIC_SCHOOL = { name: "Psionic", color: "#8f9bd6", icon: "sparkles" } as const;

export function schoolByCode(code: string): { name: string; color: string; icon: SpellGroupIconKey } | undefined {
  return SPELL_SCHOOLS.find((s) => s.code === code || s.name.toLowerCase() === code.toLowerCase()) ?? (code === "P" ? PSIONIC_SCHOOL : undefined);
}
