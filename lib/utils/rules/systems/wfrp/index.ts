import type { RuleSystemDefinition } from "../types";

export const WFRP_SYSTEM: RuleSystemDefinition = {
  key: "wfrp",
  distance: { unit: "yd", perCell: 2 },
  balance: { kind: "none" },
  progression: { levels: false, maxHp: () => null },
  characteristics: { kind: "wfrp", sheetBlock: () => undefined },
  sheetTest: {
    accepts: (body) => body.kind === "test",
    roll: () => {
      throw new Error("wfrp sheet test lands in Task 4");
    },
  },
  rest: {},
  battle: { supported: false },
  unusedMechanics: ["morale", "criticals", "formulas", "heroScaling", "initiative", "saves", "deathSaves", "concentration", "conditions", "actions", "classes", "encounters"],
};
