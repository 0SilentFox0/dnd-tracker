import { describe } from "vitest";

import { expectLabelKeys } from "../test/label-keys";

import { ABILITY_KEYS } from "@/lib/constants/abilities";
import { MONSTER_SENSE_LABELS, MONSTER_SIZE_LABELS } from "@/lib/constants/monster";

describe("units label keys", () => {
  expectLabelKeys("common", "abilities", ABILITY_KEYS.map((k) => `${k}.label`));
  expectLabelKeys("common", "monster.senses", Object.keys(MONSTER_SENSE_LABELS));
  expectLabelKeys("common", "monster.sizes", Object.keys(MONSTER_SIZE_LABELS));
  expectLabelKeys("units", "basic.gridSizes", ["1", "2", "3"]);
  expectLabelKeys("units", "basic.fields", ["level", "armorClass", "maxHp", "speed", "initiative", "proficiencyBonus", "minTargets", "maxTargets"]);
  expectLabelKeys("units", "fiveE.counts", ["multiattack", "legendaryActions", "legendaryResistances"]);
  expectLabelKeys("units", "attacks.kinds", ["melee", "ranged"]);
  expectLabelKeys("units", "attacks.targets", ["target", "aoe"]);
  expectLabelKeys("units", "spellcasting.limits", ["will", "battle", "recharge"]);
});
