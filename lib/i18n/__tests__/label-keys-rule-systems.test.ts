import { describe } from "vitest";

import { expectLabelKeys } from "../test/label-keys";

import { RULE_SYSTEM_KEYS } from "@/lib/constants/rules";
import { CHARACTERISTIC_KEYS, DEFAULT_TABLES } from "@/lib/utils/rules/systems";
import { TABLE_SLOTS } from "@/lib/utils/rules/tables-schema";
import { DIFFICULTY_KEYS } from "@/systems/wfrp/rules/percentile";
import { SKILL_CATALOG } from "@/systems/wfrp/rules/skills";

describe("rule system labels have translations", () => {
  expectLabelKeys("gameTerms", "ruleSystem", [...RULE_SYSTEM_KEYS]);
  expectLabelKeys("gameTerms", "difficulty", DIFFICULTY_KEYS);
  for (const k of CHARACTERISTIC_KEYS) expectLabelKeys("gameTerms", `characteristics.${k}`, ["label", "short"]);

  expectLabelKeys("gameTerms", "wfrpSkills", SKILL_CATALOG.map((s) => s.key));

  for (const s of SKILL_CATALOG) if (s.spec === "fixed") expectLabelKeys("gameTerms", `wfrpSpecs.${s.key}`, s.specs ?? []);

  expectLabelKeys("wfrpDowntime", "endeavours", ["earn", "train", "tend", "rest", "custom"]);
  expectLabelKeys("wfrpDowntime", "endeavourHints", ["earn", "train", "tend", "rest", "custom"]);
  expectLabelKeys("wfrpDowntime", "ailments", ["festering", "disease", "injury"]);
  expectLabelKeys("wfrpDowntime", "events", DEFAULT_TABLES.downtimeEvent.map((_, i) => String(i + 1)));
  expectLabelKeys("wfrpTables", "slots", [...TABLE_SLOTS]);
  expectLabelKeys("wfrpCorruption", "kinds", ["physical", "mental"]);
  expectLabelKeys("wfrpCorruption", "effects", ["characteristic", "move", "maxWounds"]);
  expectLabelKeys("wfrpTables", "effect", ["damage", "wounds", "condition", "marker", "characteristic", "move", "maxWounds"]);
  expectLabelKeys("wfrpCorruption", "mutations.physical", DEFAULT_TABLES.mutationPhysical.map((_, i) => String(i + 1)));
  expectLabelKeys("wfrpCorruption", "mutations.mental", DEFAULT_TABLES.mutationMental.map((_, i) => String(i + 1)));

  expectLabelKeys("rules", "system", ["label", "description", "lockedHint"]);
});
