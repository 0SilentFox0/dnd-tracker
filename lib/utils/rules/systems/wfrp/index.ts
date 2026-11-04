import type { RuleSystemDefinition } from "../types";
import { woundsBreakdown, woundsMax } from "./characteristics/derive";
import { wfrpSheetBlock } from "./characteristics/sheet-block";
import { wfrpInitiative } from "./combat/initiative";
import { mitigateWfrpDamage } from "./combat/mitigate";
import { wfrpOnZeroHp } from "./combat/on-zero-hp";
import { wfrpBaseStats, wfrpParticipantFields } from "./combat/participant";
import { resolveWfrpAttack } from "./combat/resolve-attack";
import { onSession } from "./session";
import { rollWfrpSheetTest } from "./sheet-test";

export const WFRP_SYSTEM: RuleSystemDefinition = {
  key: "wfrp",
  distance: { unit: "yd", perCell: 2 },
  balance: { kind: "none" },
  progression: { levels: false, maxHp: ({ characteristics }) => ({ total: woundsMax(characteristics), breakdown: woundsBreakdown(characteristics) }) },
  characteristics: { kind: "wfrp", sheetBlock: wfrpSheetBlock },
  sheetTest: {
    accepts: (body) => body.kind === "test",
    roll: rollWfrpSheetTest,
  },
  rest: { kinds: false, onSession },
  battle: { supported: false },
  combat: { dice: 100, actionEconomy: { bonusAction: false, reaction: false }, participantFields: wfrpParticipantFields, baseStats: wfrpBaseStats, initiative: wfrpInitiative, resolveAttack: resolveWfrpAttack, mitigateDamage: mitigateWfrpDamage, onZeroHp: wfrpOnZeroHp },
  lineage: false,
  attacks: false,
  spells: false,
  items: false,
  d20Stats: false,
  unusedMechanics: ["morale", "criticals", "formulas", "heroScaling", "initiative", "saves", "deathSaves", "concentration", "conditions", "actions", "classes", "encounters"],
};
