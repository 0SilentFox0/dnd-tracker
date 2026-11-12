import { WFRP_ADVANCEMENT } from "./rules/advancement";
import { woundsBreakdown, woundsMax } from "./rules/characteristics/derive";
import { DEFAULT_CHARACTERISTICS, readCharacteristics } from "./rules/characteristics/keys";
import { initialCharacteristics, isEmptyCharacteristics, reconcileCharacteristics, redactCharacteristics } from "./rules/characteristics/reconcile";
import { wfrpSheetBlock } from "./rules/characteristics/sheet-block";
import { wfrpActionDetails } from "./rules/combat/details";
import { extractWfrpAttacks } from "./rules/combat/extract-attacks";
import { wfrpHitModel } from "./rules/combat/hit-model";
import { wfrpInitiative } from "./rules/combat/initiative";
import { assertWfrpInput } from "./rules/combat/input";
import { wfrpLoseChannelled } from "./rules/combat/lose-channelled";
import { wfrpDamage } from "./rules/combat/mitigate";
import { wfrpOnZeroHp } from "./rules/combat/on-zero-hp";
import { participantStats, wfrpBaseStats, wfrpParticipantFields } from "./rules/combat/participant";
import { resolveWfrpAttack, wfrpAbortedRoll, wfrpAttackTarget } from "./rules/combat/resolve-attack";
import { WFRP_CONDITIONS } from "./rules/conditions";
import { WFRP_CONDITION_SET } from "./rules/conditions/standard-set";
import { WFRP_EQUIPMENT } from "./rules/equipment";
import { WFRP_MAGIC } from "./rules/magic";
import { onSession } from "./rules/session";
import { acceptsWfrpSheetTest, rollWfrpSheetTest } from "./rules/sheet-test";
import { PARTICIPANT_SLOT } from "./rules/slots";
import { WFRP_TRAITS } from "./rules/traits";

import { COINS } from "@/lib/constants/inventory";
import type { SystemData } from "@/lib/utils/rules/systems/slot";
import type { RuleSystemDefinition } from "@/lib/utils/rules/systems/types";

export const WFRP_MODULE: RuleSystemDefinition = {
  key: "wfrp",
  progression: {
    levels: false,
    hpTerm: "wounds",
    maxHp: ({ characteristics }) => {
      const c = readCharacteristics({ characteristics });

      return { total: woundsMax(c), breakdown: woundsBreakdown(c) };
    },
  },
  characteristics: { persisted: true, defaults: () => structuredClone(DEFAULT_CHARACTERISTICS) as unknown as SystemData, isEmpty: isEmptyCharacteristics, sheetBlock: wfrpSheetBlock, reconcile: reconcileCharacteristics, redact: redactCharacteristics, initial: initialCharacteristics },
  resources: {
    limits: (row) => ({ fateMax: readCharacteristics(row).fate }),
    seed: (characteristics) => ({ fortune: readCharacteristics({ characteristics }).fate }),
    fortuneOf: (p) => PARTICIPANT_SLOT.read(p.abilities.system)?.characteristics.fate,
  },
  sheetTest: {
    accepts: acceptsWfrpSheetTest,
    roll: rollWfrpSheetTest,
  },
  rest: { kinds: false, onSession },
  conditionSet: WFRP_CONDITION_SET,
  conditions: WFRP_CONDITIONS,
  magic: WFRP_MAGIC,
  advancement: WFRP_ADVANCEMENT,
  creation: true,
  downtime: true,
  corruption: true,
  equipment: WFRP_EQUIPMENT,
  traits: WFRP_TRAITS,
  currency: { coins: COINS, value: { gp: 240, sp: 12, cp: 1 }, labelKeys: { gp: "wfrpEquipment.money.gc", sp: "wfrpEquipment.money.ss", cp: "wfrpEquipment.money.d" } },
  identity: { alignments: false },
  combat: { input: { assert: assertWfrpInput }, judge: "server", dice: 100, actionEconomy: { bonusAction: false, reaction: false }, attacksOf: extractWfrpAttacks, participantFields: wfrpParticipantFields, tieBreak: (p) => participantStats(p)?.ag ?? p.abilities.dexterity, baseStats: wfrpBaseStats, initiative: wfrpInitiative, resolveAttack: resolveWfrpAttack, abortedRoll: wfrpAbortedRoll, details: wfrpActionDetails, attackTarget: wfrpAttackTarget, damage: wfrpDamage, onZeroHp: wfrpOnZeroHp, onDamaged: [wfrpLoseChannelled], hitModel: wfrpHitModel },
  lineage: false,
  classes: false,
  attacks: false,
  spells: true,
  items: false,
  inventory: true,
  d20Stats: false,
};
