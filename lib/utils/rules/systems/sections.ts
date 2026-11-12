import type { SectionsContribution } from "@/lib/utils/rules/sections";
// <systems:generated>
import { D20_SECTIONS } from "@/systems/d20/rules/sections";
import { HEROSCALING_SECTIONS } from "@/systems/heroscaling/rules/sections";
import { MORALE_SECTIONS } from "@/systems/morale/rules/sections";
import { RETALIATION_SECTIONS } from "@/systems/retaliation/rules/sections";
import { WFRP_SECTIONS } from "@/systems/wfrp/rules/sections";
// </systems:generated>

export const SECTION_CONTRIBUTIONS: Readonly<Record<string, SectionsContribution>> = {
  // <systems:generated>
  d20: D20_SECTIONS,
  heroscaling: HEROSCALING_SECTIONS,
  morale: MORALE_SECTIONS,
  retaliation: RETALIATION_SECTIONS,
  wfrp: WFRP_SECTIONS,
  // </systems:generated>
};
