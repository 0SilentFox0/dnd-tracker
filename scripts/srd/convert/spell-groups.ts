import type { SpellGroupRow } from "../lib/types";

export const SRD_SCHOOLS = [
  { key: "abjuration", name: "Abjuration", color: "#4a7bd0", icon: "shield" },
  { key: "conjuration", name: "Conjuration", color: "#d08a2c", icon: "portal" },
  { key: "divination", name: "Divination", color: "#c9b458", icon: "eye" },
  { key: "enchantment", name: "Enchantment", color: "#d0569a", icon: "heart" },
  { key: "evocation", name: "Evocation", color: "#d0432c", icon: "flame" },
  { key: "illusion", name: "Illusion", color: "#8a5cd0", icon: "mask" },
  { key: "necromancy", name: "Necromancy", color: "#5f8a3c", icon: "skull" },
  { key: "transmutation", name: "Transmutation", color: "#2ca59a", icon: "vortex" },
] as const satisfies ReadonlyArray<{ key: string; name: string; color: string; icon: SpellGroupRow["icon"] }>;

export const convertSpellGroups = (): SpellGroupRow[] => SRD_SCHOOLS.map((s) => ({ slug: `srd-2024_school-${s.key}`, name: s.name, color: s.color, icon: s.icon }));

export function schoolName(school: string): string {
  const found = SRD_SCHOOLS.find((s) => s.key === school);

  if (!found) throw new Error(`Unknown school «${school}»`);

  return found.name;
}
