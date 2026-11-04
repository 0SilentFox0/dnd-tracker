import { describe } from "vitest";

import { expectLabelKeys } from "../test/label-keys";

import { RULE_SYSTEM_KEYS } from "@/lib/constants/rules";
import { CHARACTERISTIC_KEYS } from "@/lib/utils/rules/systems";
import { DIFFICULTY_KEYS } from "@/lib/utils/rules/systems/wfrp/percentile";
import { SKILL_CATALOG } from "@/lib/utils/rules/systems/wfrp/skills";

describe("rule system labels have translations", () => {
  expectLabelKeys("gameTerms", "ruleSystem", [...RULE_SYSTEM_KEYS]);
  expectLabelKeys("gameTerms", "difficulty", DIFFICULTY_KEYS);
  for (const k of CHARACTERISTIC_KEYS) expectLabelKeys("gameTerms", `characteristics.${k}`, ["label", "short"]);

  expectLabelKeys("gameTerms", "wfrpSkills", SKILL_CATALOG.map((s) => s.key));

  for (const s of SKILL_CATALOG) if (s.spec === "fixed") expectLabelKeys("gameTerms", `wfrpSpecs.${s.key}`, s.specs ?? []);

  expectLabelKeys("rules", "system", ["label", "description", "lockedHint"]);
});
