import { wfrpPsychology } from "./psychology";
import { TRAIT_RECIPES } from "./recipes";
import { wfrpUnitBuild } from "./unit-build";

import type { RuleSystemTraits } from "@/lib/utils/rules/systems/types";

export const WFRP_TRAITS: RuleSystemTraits = { recipes: TRAIT_RECIPES, unitBuild: wfrpUnitBuild, psychology: wfrpPsychology };
