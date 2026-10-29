import { describe } from "vitest";

import { expectLabelKeys } from "../test/label-keys";

describe("ability log text has translations", () => {
  expectLabelKeys("abilityText", "log", ["damage", "heal", "revive", "immuneTo", "dot", "hot", "immune", "notOnHeroes", "berserk", "charm", "condition", "grantAction", "restoreSlot", "drainSlot", "morale", "cleanse", "mark", "guard", "cancelsEffect", "gainsEffect", "applied", "chanceMissed", "chanceSuffix", "raisedDead", "raiseRefused", "pushNoMap", "pushNowhere", "pushed", "help"]);
});
