import { ARTIFACT_SETS_IMPORT } from "./artifact-sets";
import { ARTIFACTS_IMPORT } from "./artifacts";
import { BACKGROUNDS_IMPORT } from "./backgrounds";
import { CLASSES_IMPORT } from "./classes";
import { FEATS_IMPORT } from "./feats";
import { MAIN_SKILLS_IMPORT } from "./main-skills";
import { RACES_IMPORT } from "./races";
import { SKILLS_IMPORT } from "./skills";
import { SPELL_GROUPS_IMPORT } from "./spell-groups";
import { SPELLS_IMPORT } from "./spells";
import { UNITS_IMPORT } from "./units";

import type { ImportKind, ImportSpec } from "@/types/content-import";

export const IMPORT_SPECS: Record<ImportKind, ImportSpec> = {
  units: UNITS_IMPORT,
  spells: SPELLS_IMPORT,
  skills: SKILLS_IMPORT,
  "main-skills": MAIN_SKILLS_IMPORT,
  "spell-groups": SPELL_GROUPS_IMPORT,
  races: RACES_IMPORT,
  classes: CLASSES_IMPORT,
  feats: FEATS_IMPORT,
  backgrounds: BACKGROUNDS_IMPORT,
  artifacts: ARTIFACTS_IMPORT,
  "artifact-sets": ARTIFACT_SETS_IMPORT,
};
