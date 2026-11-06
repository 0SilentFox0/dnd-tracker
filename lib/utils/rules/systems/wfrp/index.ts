import type { RuleSystemDefinition } from "../types";
import { woundsBreakdown, woundsMax } from "./characteristics/derive";
import { wfrpSheetBlock } from "./characteristics/sheet-block";
import { wfrpHitModel } from "./combat/hit-model";
import { wfrpInitiative } from "./combat/initiative";
import { mitigateWfrpDamage } from "./combat/mitigate";
import { wfrpOnZeroHp } from "./combat/on-zero-hp";
import { wfrpBaseStats, wfrpParticipantFields } from "./combat/participant";
import { resolveWfrpAttack, wfrpAttackTarget } from "./combat/resolve-attack";
import { WFRP_ADVANCEMENT } from "./advancement";
import { WFRP_CONDITIONS } from "./conditions";
import { WFRP_CREATION } from "./creation";
import { WFRP_EQUIPMENT } from "./equipment";
import { WFRP_MAGIC } from "./magic";
import { onSession } from "./session";
import { rollWfrpSheetTest } from "./sheet-test";

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
  equipment: WFRP_EQUIPMENT,
  identity: { alignments: false },
  combat: { fortune: true, dice: 100, actionEconomy: { bonusAction: false, reaction: false }, participantFields: wfrpParticipantFields, baseStats: wfrpBaseStats, initiative: wfrpInitiative, resolveAttack: resolveWfrpAttack, attackTarget: wfrpAttackTarget, mitigateDamage: mitigateWfrpDamage, onZeroHp: wfrpOnZeroHp, hitModel: wfrpHitModel },
  lineage: false,
  classes: false,
  attacks: false,
  spells: true,
  items: false,
  d20Stats: false,
  unusedMechanics: ["morale", "criticals", "formulas", "heroScaling", "initiative", "saves", "deathSaves", "concentration", "conditions", "actions", "classes", "encounters"],
};
