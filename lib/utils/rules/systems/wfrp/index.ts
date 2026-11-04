import type { RuleSystemDefinition } from "../types";
import { woundsBreakdown, woundsMax } from "./characteristics/derive";
import { onSession } from "./session";
import { rollWfrpSheetTest } from "./sheet-test";

export const WFRP_SYSTEM: RuleSystemDefinition = {
  key: "wfrp",
  distance: { unit: "yd", perCell: 2 },
  balance: { kind: "none" },
  progression: { levels: false, maxHp: ({ characteristics }) => ({ total: woundsMax(characteristics), breakdown: woundsBreakdown(characteristics) }) },
  characteristics: { kind: "wfrp", sheetBlock: () => undefined },
  sheetTest: {
    accepts: (body) => body.kind === "test",
    roll: rollWfrpSheetTest,
  },
  rest: { onSession },
  battle: { supported: false },
  unusedMechanics: ["morale", "criticals", "formulas", "heroScaling", "initiative", "saves", "deathSaves", "concentration", "conditions", "actions", "classes", "encounters"],
};
