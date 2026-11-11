import { WFRP_ADVANCEMENT } from "./rules/advancement";
import { woundsBreakdown, woundsMax } from "./rules/characteristics/derive";
import { wfrpSheetBlock } from "./rules/characteristics/sheet-block";
import { wfrpHitModel } from "./rules/combat/hit-model";
import { wfrpInitiative } from "./rules/combat/initiative";
import { mitigateWfrpDamage } from "./rules/combat/mitigate";
import { wfrpOnZeroHp } from "./rules/combat/on-zero-hp";
import { wfrpBaseStats, wfrpParticipantFields } from "./rules/combat/participant";
import { resolveWfrpAttack, wfrpAttackTarget } from "./rules/combat/resolve-attack";
import { WFRP_CONDITIONS } from "./rules/conditions";
import { WFRP_CORRUPTION } from "./rules/corruption";
import { WFRP_CREATION } from "./rules/creation";
import { WFRP_DOWNTIME } from "./rules/downtime";
import { WFRP_EQUIPMENT } from "./rules/equipment";
import { WFRP_MAGIC } from "./rules/magic";
import { onSession } from "./rules/session";
import { rollWfrpSheetTest } from "./rules/sheet-test";
import { WFRP_TRAITS } from "./rules/traits";

import { COINS } from "@/lib/constants/inventory";
import type { RuleSystemDefinition } from "@/lib/utils/rules/systems/types";

export const WFRP_SYSTEM: RuleSystemDefinition = {
  key: "wfrp",
  distance: { unit: "yd", perCell: 2 },
  balance: { kind: "fair" },
  progression: { levels: false, maxHp: ({ characteristics }) => ({ total: woundsMax(characteristics), breakdown: woundsBreakdown(characteristics) }) },
  characteristics: { kind: "wfrp", sheetBlock: wfrpSheetBlock },
  sheetTest: {
    accepts: (body) => body.kind === "test",
    roll: rollWfrpSheetTest,
  },
  rest: { kinds: false, onSession },
  battle: { supported: true },
  conditions: WFRP_CONDITIONS,
  magic: WFRP_MAGIC,
  advancement: WFRP_ADVANCEMENT,
  creation: WFRP_CREATION,
  downtime: WFRP_DOWNTIME,
  corruption: WFRP_CORRUPTION,
  equipment: WFRP_EQUIPMENT,
  traits: WFRP_TRAITS,
  currency: { coins: COINS, value: { gp: 240, sp: 12, cp: 1 }, labelKeys: { gp: "wfrpEquipment.money.gc", sp: "wfrpEquipment.money.ss", cp: "wfrpEquipment.money.d" } },
  identity: { alignments: false },
  combat: { fortune: true, dice: 100, actionEconomy: { bonusAction: false, reaction: false }, participantFields: wfrpParticipantFields, baseStats: wfrpBaseStats, initiative: wfrpInitiative, resolveAttack: resolveWfrpAttack, attackTarget: wfrpAttackTarget, mitigateDamage: mitigateWfrpDamage, onZeroHp: wfrpOnZeroHp, hitModel: wfrpHitModel },
  lineage: false,
  classes: false,
  attacks: false,
  spells: true,
  items: false,
  inventory: true,
  d20Stats: false,
  unusedMechanics: ["morale", "criticals", "formulas", "heroScaling", "initiative", "saves", "deathSaves", "concentration", "conditions", "actions", "classes", "encounters"],
};
