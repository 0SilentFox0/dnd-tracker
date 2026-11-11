import { rollFromSheet } from "@/lib/utils/characters/resources/sheet-roll";
import type { RuleSystemDefinition } from "@/lib/utils/rules/systems/types";
import type { SheetRollSubject } from "@/types/characters";

export const D20_MODULE: RuleSystemDefinition = {
  key: "d20",
  distance: { unit: "ft", perCell: 5 },
  progression: { levels: true, hpTerm: "hp", maxHp: () => null },
  characteristics: { persisted: false, defaults: () => undefined, isEmpty: (v) => v == null || (typeof v === "object" && Object.keys(v).length === 0), sheetBlock: () => undefined },
  sheetTest: {
    accepts: (body) => body.kind !== "test",
    roll: (i) => rollFromSheet(i.participant, i.body as SheetRollSubject, i),
  },
  rest: { kinds: true },
  combat: { judge: "client", dice: 20, actionEconomy: { bonusAction: true, reaction: true } },
  identity: { alignments: true },
  lineage: true,
  classes: true,
  attacks: true,
  spells: true,
  items: true,
  inventory: true,
  d20Stats: true,
};