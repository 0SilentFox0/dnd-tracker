import { D20_ACTIONS } from "./rules/actions";
import { d20AbortedRoll, resolveD20Attack } from "./rules/attack";
import { d20HitModel } from "./rules/balance";
import { concentrationFallout } from "./rules/concentration/damaged";
import { D20_CONDITION_SET } from "./rules/conditions";
import { d20Damage } from "./rules/damage";
import { d20OnZeroHp } from "./rules/death-saves/on-zero-hp";
import { reviveFromDying } from "./rules/death-saves/state";
import { d20Initiative, d20TieBreak } from "./rules/initiative";
import { D20_MAGIC } from "./rules/magic";
import { d20UnitSpellDc } from "./rules/participant/unit-spell-dc";
import { D20_REACTIONS, d20ProvokedOpportunity } from "./rules/reactions";
import { D20_PROFICIENCY, D20_SAVES } from "./rules/saves";
import { rollFromSheet } from "./rules/sheet-roll";
import { D20_TURN } from "./rules/turn";

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
  combat: { judge: "client", dice: 20, actionEconomy: { bonusAction: true, reaction: true }, resolveAttack: resolveD20Attack, damage: d20Damage, abortedRoll: d20AbortedRoll, onZeroHp: d20OnZeroHp, onDamaged: [concentrationFallout], onRevived: reviveFromDying, turn: D20_TURN, actions: D20_ACTIONS, reactions: D20_REACTIONS, saves: D20_SAVES, proficiency: D20_PROFICIENCY, afterAttack: [d20ProvokedOpportunity], initiative: d20Initiative, tieBreak: d20TieBreak, hitModel: d20HitModel },
  participant: { fromUnit: [d20UnitSpellDc] },
  conditionSet: D20_CONDITION_SET,
  magic: D20_MAGIC,
  identity: { alignments: true },
  lineage: true,
  classes: true,
  attacks: true,
  spells: true,
  items: true,
  inventory: true,
  d20Stats: true,
};