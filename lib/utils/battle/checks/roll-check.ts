import type { AbilityKey } from "@/lib/constants/abilities";
import { DEFAULT_RULES_EDITION } from "@/lib/constants/rules";
import { DND_SKILL_META,type DndSkill } from "@/lib/constants/skills";
import { collectModifiers, type ModifierResult } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { withSelf } from "@/lib/utils/abilities/engine/core/participants";
import { exhaustionLevel } from "@/lib/utils/battle/conditions/query";
import { armorPenalty, armorPenaltyAffects } from "@/lib/utils/battle/proficiency";
import { type D20Mode, rollD20WithMode } from "@/lib/utils/battle/saves/roll-d20";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";

export type CheckSubject = { skill: DndSkill } | { ability: AbilityKey };

const covers = (skills: readonly DndSkill[] | "all", skill: DndSkill | undefined) => skills === "all" || (!!skill && skills.includes(skill));

const abilityOf = (subject: CheckSubject): AbilityKey => ("skill" in subject ? DND_SKILL_META[subject.skill].ability : subject.ability);

const skillOf = (subject: CheckSubject): DndSkill | undefined => ("skill" in subject ? subject.skill : undefined);

function exhaustionVariant(p: BattleParticipant, rules?: Ruleset) {
  return p.battleData.activeEffects.find((e) => e.exhaustionVariant)?.exhaustionVariant ?? rules?.conditions.exhaustion ?? DEFAULT_RULES_EDITION;
}

const CHECK_FLAGS = ["checkAdvantage", "checkDisadvantage", "skillProficiency", "skillExpertise"] as const;

type CheckFlags = ModifierResult["flags"];

const checkFlags = (actor: BattleParticipant, participants: BattleParticipant[]): CheckFlags => collectModifiers(withSelf(participants, actor), actor.basicInfo.id, { flags: CHECK_FLAGS }).flags;

function modeFrom(actor: BattleParticipant, subject: CheckSubject, flags: CheckFlags, rules?: Ruleset, extraAdvantage = false): D20Mode {
  const skill = skillOf(subject);

  const has = (flag: "checkAdvantage" | "checkDisadvantage") => flags.some((f) => f.flag === flag && covers(f.skills, skill));

  const adv = has("checkAdvantage") || extraAdvantage;

  const dis = has("checkDisadvantage") || (exhaustionLevel(actor) >= 1 && exhaustionVariant(actor, rules) === "2014") || (armorPenalty(actor) && armorPenaltyAffects(abilityOf(subject)));

  return adv && !dis ? "advantage" : dis && !adv ? "disadvantage" : "normal";
}

function bonusFrom(actor: BattleParticipant, subject: CheckSubject, flags: CheckFlags, rules?: Ruleset): { mod: number; bonus: number } {
  const skill = skillOf(subject);

  const listed = (flag: "skillProficiency" | "skillExpertise", s: DndSkill) => flags.some((f) => f.flag === flag && f.skills.includes(s));

  const proficient = !!skill && (!!actor.abilities.skillProficiencies?.includes(skill) || listed("skillProficiency", skill));

  const proficiency = proficient ? actor.abilities.proficiencyBonus * (skill && listed("skillExpertise", skill) ? 2 : 1) : 0;

  const exhaustion = exhaustionVariant(actor, rules) === "2024" ? -2 * exhaustionLevel(actor) : 0;

  return { mod: actor.abilities.modifiers[abilityOf(subject)], bonus: proficiency + exhaustion };
}

export function checkBonus(actor: BattleParticipant, subject: CheckSubject, participants: BattleParticipant[], rules?: Ruleset): { mod: number; bonus: number } {
  return bonusFrom(actor, subject, checkFlags(actor, participants), rules);
}

export function rollCheck(input: {
  actor: BattleParticipant;
  subject: CheckSubject;
  participants: BattleParticipant[];
  rules?: Ruleset;
  rng: () => number;
  presetRoll?: number;
  advantage?: boolean;
}): { roll: number; rolls: number[]; mod: number; bonus: number; total: number; mode: D20Mode } {
  const { actor, subject, participants, rules, rng, presetRoll } = input;

  const flags = checkFlags(actor, participants);

  const mode = modeFrom(actor, subject, flags, rules, !!input.advantage);

  const { roll, rolls } = rollD20WithMode(mode, rng, presetRoll);

  const { mod, bonus } = bonusFrom(actor, subject, flags, rules);

  return { roll, rolls, mod, bonus, total: roll + mod + bonus, mode };
}

export function passivePerception(p: BattleParticipant, participants: BattleParticipant[], rules?: Ruleset): number {
  const flags = checkFlags(p, participants);

  const { mod, bonus } = bonusFrom(p, { skill: "perception" }, flags, rules);

  const mode = modeFrom(p, { skill: "perception" }, flags, rules);

  return 10 + mod + bonus + (mode === "advantage" ? 5 : mode === "disadvantage" ? -5 : 0);
}
