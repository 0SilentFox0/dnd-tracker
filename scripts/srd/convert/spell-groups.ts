import type { SpellGroupRow } from "../lib/types";

import { SPELL_SCHOOLS } from "@/lib/constants/spell-groups";

export const SRD_SCHOOLS = SPELL_SCHOOLS;

export const MONSTER_ACTIONS_GROUP = "Monster Actions";

export const convertSpellGroups = (): SpellGroupRow[] => [...SRD_SCHOOLS.map((s) => ({ slug: `srd-2024_school-${s.key}`, name: s.name, color: s.color, icon: s.icon })), { slug: "srd-2024_monster-actions", name: MONSTER_ACTIONS_GROUP, color: "#a34c38", icon: "skull" }];

export function schoolName(school: string): string {
  const found = SRD_SCHOOLS.find((s) => s.key === school);

  if (!found) throw new Error(`Unknown school «${school}»`);

  return found.name;
}
