import { CORE_SECTIONS } from "./core-sections";
import { mergeContributions, type SectionMap, type SectionsContribution, sectionsOf } from "./sections";

import { type Composition, composition, type CompositionIssue, type SystemSelection } from "@/lib/utils/rules/systems/catalog";
import { CompositionError } from "@/lib/utils/rules/systems/compose";
import { SECTION_CONTRIBUTIONS } from "@/lib/utils/rules/systems/sections";

export const sectionsOfComposition = (c: Composition): SectionMap => sectionsOf(c, SECTION_CONTRIBUTIONS, CORE_SECTIONS);

export const sectionsOfSystem = (system: SystemSelection): SectionMap => sectionsOfComposition(composition(system));

/** Every registered section regardless of the active composition (transitional: readers still see the full Ruleset) */
export const allSections = (): SectionMap =>
  mergeContributions([{ id: "core", contribution: CORE_SECTIONS }, ...Object.entries(SECTION_CONTRIBUTIONS).map(([id, contribution]) => ({ id, contribution }))]);

export const ALL_SECTIONS: SectionMap = allSections();

export function validateSections(c: Composition, contributions: Readonly<Record<string, SectionsContribution>> = SECTION_CONTRIBUTIONS): CompositionIssue[] {
  try {
    sectionsOf(c, contributions, CORE_SECTIONS);

    return [];
  } catch (e) {
    if (e instanceof CompositionError) return [{ code: "sectionCollision", detail: e.message }];

    throw e;
  }
}
