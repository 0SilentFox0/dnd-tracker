import { describe } from "vitest";

import { expectLabelKeys } from "../test/label-keys";

import { CRITICAL_FAIL_EFFECTS, CRITICAL_SUCCESS_EFFECTS,type CriticalEffect } from "@/lib/constants/critical-effects";
import { XP_DIFFICULTIES } from "@/lib/constants/experience";
import { SAVE_FAIL_EFFECTS, SAVE_SUCCESS_EFFECTS } from "@/lib/constants/save-critical-effects";

const critKeys = (effects: CriticalEffect[]) => effects.flatMap((e) => [`${e.id}.name`, `${e.id}.description`, ...Array.from({ length: e.flavorCount }, (_, i) => `${e.id}.flavor.${i + 1}`)]);

describe("battleTerms has translations", () => {
  expectLabelKeys("battleTerms", "crits.attack.success", critKeys(CRITICAL_SUCCESS_EFFECTS));
  expectLabelKeys("battleTerms", "crits.attack.fail", critKeys(CRITICAL_FAIL_EFFECTS));
  expectLabelKeys("battleTerms", "crits.save.success", critKeys(SAVE_SUCCESS_EFFECTS));
  expectLabelKeys("battleTerms", "crits.save.fail", critKeys(SAVE_FAIL_EFFECTS));
  expectLabelKeys("battleTerms", "encounterDifficulty", ["trivial", ...XP_DIFFICULTIES["2014"], ...XP_DIFFICULTIES["2024"]]);
});
