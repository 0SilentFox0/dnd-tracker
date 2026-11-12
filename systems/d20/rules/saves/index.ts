import { classProficiencies, withGrantedProficiencies } from "../proficiency/collect";
import { evasionFactor, hasEvasion } from "./evasion";
import { resolveSave } from "./legendary";
import { bestSaveAbility, rollSave } from "./roll-save";
import { rollSaveEnds } from "./save-ends";

import type { RuleSystemProficiency, RuleSystemSaves } from "@/lib/utils/battle/saves/types";

export const D20_SAVES: RuleSystemSaves = {
  roll: rollSave,
  resolve: resolveSave,
  bestAbility: bestSaveAbility,
  evasion: { has: hasEvasion, factor: evasionFactor },
  rollEnds: rollSaveEnds,
};

export const D20_PROFICIENCY: RuleSystemProficiency = { fromClasses: classProficiencies, withGranted: withGrantedProficiencies };
