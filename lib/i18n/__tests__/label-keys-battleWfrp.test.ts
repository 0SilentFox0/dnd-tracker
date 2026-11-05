import { describe } from "vitest";

import { expectLabelKeys } from "../test/label-keys";

import { WFRP_CONDITION_KEYS } from "@/lib/utils/rules/systems/wfrp/conditions/catalog";

describe("wfrp battle labels have translations", () => {
  for (const k of WFRP_CONDITION_KEYS) expectLabelKeys("battleWfrp", `conditions.${k}`, ["label", "description"]);
});
