import { rollD20WithMode } from "./roll-d20";

import type { AbilityKey } from "@/lib/constants/abilities";
import { collectModifiers } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { withSelf } from "@/lib/utils/abilities/engine/core/participants";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";

export type SaveRollMode = "advantage" | "disadvantage" | "normal";

const covers = (abilities: readonly AbilityKey[] | "all", ability: AbilityKey) => abilities === "all" || abilities.includes(ability);

export function saveRollMode(
  target: BattleParticipant,
  ability: AbilityKey,
  participants: BattleParticipant[],
  opts: { vsSpell?: boolean } = {},
): { mode: SaveRollMode; autoFail: boolean; reasons: { advantage: string[]; disadvantage: string[] } } {
  const ps = withSelf(participants, target);

  const id = target.basicInfo.id;

  const entries = (flag: "saveAdvantage" | "saveDisadvantage" | "autoFailSave") => collectModifiers(ps, id, { flag }).entries;

  const advantage = entries("saveAdvantage")
    .filter((e) => e.flag?.flag === "saveAdvantage" && covers(e.flag.abilities, ability) && (!e.flag.vsSpells || opts.vsSpell))
    .map((e) => e.label);

  const disadvantage = entries("saveDisadvantage")
    .filter((e) => e.flag?.flag === "saveDisadvantage" && covers(e.flag.abilities, ability))
    .map((e) => e.label);

  const autoFail = entries("autoFailSave").some((e) => e.flag?.flag === "autoFailSave" && e.flag.abilities.includes(ability));

  const reasons = { advantage: [...new Set(advantage)], disadvantage: [...new Set(disadvantage)] };

  const adv = reasons.advantage.length > 0;

  const dis = reasons.disadvantage.length > 0;

  return { mode: adv && !dis ? "advantage" : dis && !adv ? "disadvantage" : "normal", autoFail, reasons };
}

function proficiencyBonus(target: BattleParticipant, ability: AbilityKey, participants: BattleParticipant[], rules?: Ruleset): number {
  const byRules = !!rules?.saves.proficiency && !!target.abilities.saveProficiencies?.includes(ability);

  const byFlag = collectModifiers(withSelf(participants, target), target.basicInfo.id, { flag: "saveProficiency" }).flags.some((f) => f.flag === "saveProficiency" && f.abilities.includes(ability));

  return byRules || byFlag ? target.abilities.proficiencyBonus : 0;
}

export function rollSave(input: {
  target: BattleParticipant;
  ability: AbilityKey;
  dc: number;
  participants: BattleParticipant[];
  rules?: Ruleset;
  rng: () => number;
  presetRoll?: number;
  vsSpell?: boolean;
}): { roll: number; rolls: number[]; mod: number; bonus: number; total: number; success: boolean; mode: SaveRollMode; autoFail: boolean } {
  const { target, ability, dc, participants, rules, rng, presetRoll, vsSpell } = input;

  const mod = target.abilities.modifiers[ability];

  const { mode, autoFail } = saveRollMode(target, ability, participants, { vsSpell });

  if (autoFail) return { roll: 0, rolls: [], mod, bonus: 0, total: 0, success: false, mode, autoFail: true };

  const { roll, rolls } = rollD20WithMode(mode, rng, presetRoll);

  const bonus = proficiencyBonus(target, ability, participants, rules) + collectModifiers(withSelf(participants, target), target.basicInfo.id, { stat: "savingThrow" }).flat;

  const total = roll + mod + bonus;

  return { roll, rolls, mod, bonus, total, success: total >= dc, mode, autoFail: false };
}
