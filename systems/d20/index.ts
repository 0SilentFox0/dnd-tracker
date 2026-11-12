import { d20AbortedRoll, resolveD20Attack } from "./rules/attack";
import { d20HitModel } from "./rules/balance";
import { D20_CONDITION_SET } from "./rules/conditions";
import { d20Damage } from "./rules/damage";
import { d20Initiative, d20TieBreak } from "./rules/initiative";

import { rollFromSheet } from "@/lib/utils/characters/resources/sheet-roll";
import type { RuleSystemDefinition } from "@/lib/utils/rules/systems/types";
import type { SheetRollSubject } from "@/types/characters";

export const D20_MODULE: RuleSystemDefinition = {
  key: "d20",
  progression: { levels: true, hpTerm: "hp", maxHp: () => null },
  characteristics: { persisted: false, defaults: () => undefined, isEmpty: (v) => v == null || (typeof v === "object" && Object.keys(v).length === 0), sheetBlock: () => undefined },
  sheetTest: {
    accepts: (body) => body.kind !== "test",
    roll: (i) => rollFromSheet(i.participant, i.body as SheetRollSubject, i),
  },
  rest: { kinds: true },
  combat: { judge: "client", dice: 20, actionEconomy: { bonusAction: true, reaction: true }, resolveAttack: resolveD20Attack, damage: d20Damage, abortedRoll: d20AbortedRoll, initiative: d20Initiative, tieBreak: d20TieBreak, hitModel: d20HitModel },
  conditionSet: D20_CONDITION_SET,
  identity: { alignments: true },
  lineage: true,
  classes: true,
  attacks: true,
  spells: true,
  items: true,
  inventory: true,
  d20Stats: true,
};