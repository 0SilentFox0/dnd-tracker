import { describe } from "vitest";

import { expectLabelKeys } from "../test/label-keys";

import { RULE_SYSTEM_KEYS } from "@/lib/constants/rules";

describe("rule system labels have translations", () => {
  expectLabelKeys("gameTerms", "ruleSystem", [...RULE_SYSTEM_KEYS]);
  expectLabelKeys("rules", "system", ["label", "description", "lockedHint"]);
});
