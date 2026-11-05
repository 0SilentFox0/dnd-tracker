import { describe } from "vitest";

import { expectLabelKeys } from "../test/label-keys";

import { CRIT_TABLE } from "@/lib/utils/rules/systems/wfrp/combat/crit-table";
import { WFRP_CONDITION_KEYS } from "@/lib/utils/rules/systems/wfrp/conditions/catalog";

describe("wfrp battle labels have translations", () => {
  for (const k of WFRP_CONDITION_KEYS) expectLabelKeys("battleWfrp", `conditions.${k}`, ["label", "description"]);

  expectLabelKeys("battleWfrp", "damage.steps", ["weapon", "sb", "netSl", "tb", "ap", "minimum", "crit"]);
  expectLabelKeys("battleWfrp", "damage", ["total"]);
  expectLabelKeys("battleWfrp", "log", ["critHit", "critWound", "unconscious"]);
  expectLabelKeys("battleWfrp", "crit", Object.entries(CRIT_TABLE).flatMap(([loc, rows]) => rows.map((_, i) => `${loc}.${i + 1}`)));
});
