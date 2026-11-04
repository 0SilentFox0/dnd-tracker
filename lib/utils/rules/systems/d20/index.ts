import type { RuleSystemDefinition, RuleSystemKey } from "../types";

import { rollFromSheet } from "@/lib/utils/characters/resources/sheet-roll";
import type { SheetRollSubject } from "@/types/characters";

export const d20System = (key: Extract<RuleSystemKey, "homm" | "dnd5e">): RuleSystemDefinition => ({
  key,
  distance: { unit: "ft", perCell: 5 },
  balance: { kind: "fair" },
  progression: { levels: true, maxHp: () => null },
  characteristics: { kind: "d20", sheetBlock: () => undefined },
  sheetTest: {
    accepts: (body) => body.kind !== "test",
    roll: (i) => rollFromSheet(i.participant, i.body as SheetRollSubject, i),
  },
  rest: {},
  battle: { supported: true },
  unusedMechanics: [],
});
