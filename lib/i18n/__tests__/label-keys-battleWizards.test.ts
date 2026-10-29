import { describe } from "vitest";

import { expectLabelKeys } from "../test/label-keys";

describe("battleWizards has translations", () => {
  expectLabelKeys("battleWizards", "attack.steps", ["weapon", "target", "roll", "damage", "summary"]);
  expectLabelKeys("battleWizards", "attack.kinds", ["melee", "ranged"]);
  expectLabelKeys("battleWizards", "attack.weapon", ["melee", "ranged"]);
  expectLabelKeys("battleWizards", "attack.roll.rollModes", ["normal", "advantage", "disadvantage"]);
  expectLabelKeys("battleWizards", "spell.book.targets", ["next", "template", "pick"]);
});
