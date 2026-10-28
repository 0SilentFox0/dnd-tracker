import type { AbilityKey } from "@/lib/constants/abilities";
import { DND_SKILL_META,type DndSkill } from "@/lib/constants/skills";
import { collectModifiers } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { withSelf } from "@/lib/utils/abilities/engine/core/participants";
import { exhaustionLevel } from "@/lib/utils/battle/conditions/query";
import { type D20Mode, rollD20WithMode } from "@/lib/utils/battle/saves/roll-d20";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";

export type CheckSubject = { skill: DndSkill } | { ability: AbilityKey };

const covers = (skills: readonly DndSkill[] | "all", skill: DndSkill | undefined) => skills === "all" || (!!skill && skills.includes(skill));

const abilityOf = (subject: CheckSubject): AbilityKey => ("skill" in subject ? DND_SKILL_META[subject.skill].ability : subject.ability);

const skillOf = (subject: CheckSubject): DndSkill | undefined => ("skill" in subject ? subject.skill : undefined);

function exhaustionVariant(p: BattleParticipant, rules?: Ruleset) {
  return p.battleData.activeEffects.find((e) => e.exhaustionVariant)?.exhaustionVariant ?? rules?.conditions.exhaustion ?? "2014";
}

function checkMode(actor: BattleParticipant, skill: DndSkill | undefined, participants: BattleParticipant[], rules?: Ruleset): D20Mode {
  const ps = withSelf(participants, actor);

  const labels = (flag: "checkAdvantage" | "checkDisadvantage") =>
    collectModifiers(ps, actor.basicInfo.id, { flag }).entries.filter((e) => e.flag?.flag === flag && covers(e.flag.skills, skill));

  const adv = labels("checkAdvantage").length > 0;

  const dis = labels("checkDisadvantage").length > 0 || (exhaustionLevel(actor) >= 1 && exhaustionVariant(actor, rules) === "2014");

  return adv && !dis ? "advantage" : dis && !adv ? "disadvantage" : "normal";
}

function skillProficient(actor: BattleParticipant, skill: DndSkill, participants: BattleParticipant[]): boolean {
  const byData = !!actor.abilities.skillProficiencies?.includes(skill);

  return byData || collectModifiers(withSelf(participants, actor), actor.basicInfo.id, { flag: "skillProficiency" }).flags.some((f) => f.flag === "skillProficiency" && f.skills.includes(skill));
}

export function checkBonus(actor: BattleParticipant, subject: CheckSubject, participants: BattleParticipant[], rules?: Ruleset): { mod: number; bonus: number } {
  const skill = skillOf(subject);

  const proficiency = skill && skillProficient(actor, skill, participants) ? actor.abilities.proficiencyBonus : 0;

  const exhaustion = exhaustionVariant(actor, rules) === "2024" ? -2 * exhaustionLevel(actor) : 0;

  return { mod: actor.abilities.modifiers[abilityOf(subject)], bonus: proficiency + exhaustion };
}

export function rollCheck(input: {
  actor: BattleParticipant;
  subject: CheckSubject;
  participants: BattleParticipant[];
  rules?: Ruleset;
  rng: () => number;
  presetRoll?: number;
}): { roll: number; rolls: number[]; mod: number; bonus: number; total: number; mode: D20Mode } {
  const { actor, subject, participants, rules, rng, presetRoll } = input;

  const mode = checkMode(actor, skillOf(subject), participants, rules);

  const { roll, rolls } = rollD20WithMode(mode, rng, presetRoll);

  const { mod, bonus } = checkBonus(actor, subject, participants, rules);

  return { roll, rolls, mod, bonus, total: roll + mod + bonus, mode };
}

export function passivePerception(p: BattleParticipant, participants: BattleParticipant[], rules?: Ruleset): number {
  const { mod, bonus } = checkBonus(p, { skill: "perception" }, participants, rules);

  const mode = checkMode(p, "perception", participants, rules);

  return 10 + mod + bonus + (mode === "advantage" ? 5 : mode === "disadvantage" ? -5 : 0);
}
