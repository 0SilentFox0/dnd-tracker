import { describe } from "vitest";

import { expectLabelKeys } from "../test/label-keys";

import { RULE_SYSTEM_KEYS } from "@/lib/constants/rules";
import { DIFFICULTY_KEYS } from "@/lib/utils/rules/systems/wfrp/percentile";

describe("rule system labels have translations", () => {
  expectLabelKeys("gameTerms", "ruleSystem", [...RULE_SYSTEM_KEYS]);
  expectLabelKeys("gameTerms", "difficulty", DIFFICULTY_KEYS);
  expectLabelKeys("rules", "system", ["label", "description", "lockedHint"]);
});
