import { describe } from "vitest";

import { expectLabelKeys } from "../test/label-keys";

describe("units label keys", () => {
  expectLabelKeys("units", "basic.gridSizes", ["1", "2", "3"]);
  expectLabelKeys("units", "basic.fields", ["level", "armorClass", "maxHp", "speed", "initiative", "proficiencyBonus", "minTargets", "maxTargets"]);
  expectLabelKeys("units", "fiveE.counts", ["multiattack", "legendaryActions", "legendaryResistances"]);
  expectLabelKeys("units", "attacks.kinds", ["melee", "ranged"]);
  expectLabelKeys("units", "attacks.targets", ["target", "aoe"]);
  expectLabelKeys("units", "spellcasting.limits", ["will", "battle", "recharge"]);
});
