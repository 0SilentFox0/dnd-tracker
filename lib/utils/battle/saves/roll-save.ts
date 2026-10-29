import { rollD20WithMode } from "./roll-d20";

import type { AbilityKey } from "@/lib/constants/abilities";
import { collectModifiers, type ModifierResult } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { withSelf } from "@/lib/utils/abilities/engine/core/participants";
import { ARMOR_PENALTY_LABEL, armorPenalty, armorPenaltyAffects } from "@/lib/utils/battle/proficiency";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";

export type SaveRollMode = "advantage" | "disadvantage" | "normal";

const covers = (abilities: readonly AbilityKey[] | "all", ability: AbilityKey) => abilities === "all" || abilities.includes(ability);

const SAVE_FLAGS = ["saveAdvantage", "saveDisadvantage", "autoFailSave", "saveProficiency"] as const;

type SaveFlagEntries = ModifierResult["entries"];

const saveFlagEntries = (ps: BattleParticipant[], id: string): SaveFlagEntries => collectModifiers(ps, id, { flags: SAVE_FLAGS }).entries;

function modeFrom(entries: SaveFlagEntries, ability: AbilityKey, vsSpell?: boolean, armorBlocked = false): { mode: SaveRollMode; autoFail: boolean; reasons: { advantage: string[]; disadvantage: string[] } } {
  const advantage = entries
    .filter((e) => e.flag?.flag === "saveAdvantage" && covers(e.flag.abilities, ability) && (!e.flag.vsSpells || vsSpell))
    .map((e) => e.label);

  const disadvantage = [...entries.filter((e) => e.flag?.flag === "saveDisadvantage" && covers(e.flag.abilities, ability)).map((e) => e.label), ...(armorBlocked && armorPenaltyAffects(ability) ? [ARMOR_PENALTY_LABEL] : [])];

  const autoFail = entries.some((e) => e.flag?.flag === "autoFailSave" && e.flag.abilities.includes(ability));

  const reasons = { advantage: [...new Set(advantage)], disadvantage: [...new Set(disadvantage)] };

  const adv = reasons.advantage.length > 0;

  const dis = reasons.disadvantage.length > 0;

  return { mode: adv && !dis ? "advantage" : dis && !adv ? "disadvantage" : "normal", autoFail, reasons };
}

export function saveRollMode(
  target: BattleParticipant,
  ability: AbilityKey,
  participants: BattleParticipant[],
  opts: { vsSpell?: boolean } = {},
): { mode: SaveRollMode; autoFail: boolean; reasons: { advantage: string[]; disadvantage: string[] } } {
  return modeFrom(saveFlagEntries(withSelf(participants, target), target.basicInfo.id), ability, opts.vsSpell, armorPenalty(target));
}

function proficiencyBonus(target: BattleParticipant, ability: AbilityKey, entries: SaveFlagEntries, rules?: Ruleset): number {
  const byRules = !!rules?.saves.proficiency && !!target.abilities.saveProficiencies?.includes(ability);

  const byFlag = entries.some((e) => e.flag?.flag === "saveProficiency" && e.flag.abilities.includes(ability));

  return byRules || byFlag ? target.abilities.proficiencyBonus : 0;
}

/** Краща з двох характеристик за бонусом кидка (при рівності — перша). */
export function bestSaveAbility(target: BattleParticipant, [first, second]: [AbilityKey, AbilityKey], participants: BattleParticipant[], rules?: Ruleset): AbilityKey {
  const entries = saveFlagEntries(withSelf(participants, target), target.basicInfo.id);

  const bonus = (a: AbilityKey) => target.abilities.modifiers[a] + proficiencyBonus(target, a, entries, rules);

  return bonus(second) > bonus(first) ? second : first;
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
  advantage?: boolean;
}): { roll: number; rolls: number[]; mod: number; bonus: number; total: number; success: boolean; mode: SaveRollMode; autoFail: boolean } {
  const { target, ability, dc, participants, rules, rng, presetRoll, vsSpell } = input;

  const mod = target.abilities.modifiers[ability];

  const ps = withSelf(participants, target);

  const entries = saveFlagEntries(ps, target.basicInfo.id);

  const sm = modeFrom(entries, ability, vsSpell, armorPenalty(target));

  const mode: SaveRollMode = input.advantage ? (sm.reasons.disadvantage.length > 0 ? "normal" : "advantage") : sm.mode;

  const { autoFail } = sm;

  if (autoFail) return { roll: 0, rolls: [], mod, bonus: 0, total: 0, success: false, mode, autoFail: true };

  const { roll, rolls } = rollD20WithMode(mode, rng, presetRoll);

  const bonus = proficiencyBonus(target, ability, entries, rules) + collectModifiers(ps, target.basicInfo.id, { stat: "savingThrow" }).flat;

  const total = roll + mod + bonus;

  return { roll, rolls, mod, bonus, total, success: total >= dc, mode, autoFail: false };
}
