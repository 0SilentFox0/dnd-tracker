import { describe } from "vitest";

import { expectLabelKeys } from "../test/label-keys";

describe("abilities editor labels have translations", () => {
  expectLabelKeys("abilities", "copy.kinds", ["skill", "race", "artifact", "artifactSet", "unit", "class", "feat"]);
  expectLabelKeys("abilities", "fields.modes", ["number", "dice", "formula", "scale", "spellRoll", "eventDamage", "maxHp", "ownerAttack"]);
  expectLabelKeys("abilities", "limits", ["perBattle", "perRound", "perTurn", "cooldownRounds", "chance"]);
});
