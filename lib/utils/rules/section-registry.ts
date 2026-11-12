import { CORE_SECTIONS } from "./core-sections";
import { mergeContributions, type SectionMap, sectionsOf } from "./sections";

import { type Composition, composition, type SystemSelection } from "@/lib/utils/rules/systems/catalog";
import { SECTION_CONTRIBUTIONS } from "@/lib/utils/rules/systems/sections";

export const sectionsOfComposition = (c: Composition): SectionMap => sectionsOf(c, SECTION_CONTRIBUTIONS, CORE_SECTIONS);

export const sectionsOfSystem = (system: SystemSelection): SectionMap => sectionsOfComposition(composition(system));

/** Every registered section regardless of the active composition (transitional: readers still see the full Ruleset) */
export const allSections = (): SectionMap =>
  mergeContributions([{ id: "core", contribution: CORE_SECTIONS }, ...Object.entries(SECTION_CONTRIBUTIONS).map(([id, contribution]) => ({ id, contribution }))]);
