import { type DndSkill, isDndSkill } from "@/lib/constants/skills";
import { choiceIssue } from "@/lib/utils/characters/choices/validate";
import { skillFlags } from "@/lib/utils/characters/choices/walk";
import type { ChoiceIssue, Picks } from "@/types/choices";
import type { GameClassData } from "@/types/classes";

/** Skill ids anywhere in picks (nested feat picks included). */
export function skillIdsInPicks(picks: Picks | undefined): DndSkill[] {
  return Object.values(picks ?? {}).flatMap((list) => list.flatMap((p) => [...(isDndSkill(p.id) ? [p.id] : []), ...skillIdsInPicks(p.picks)]));
}

/** First-class `skillChoices`: flags must come from the class list or other known sources, and the class share must fit `count`. */
export function classSkillIssues(input: { skills: unknown; cls: Pick<GameClassData, "skillChoices">; otherSources: readonly DndSkill[] }): ChoiceIssue[] {
  const { count, from } = input.cls.skillChoices;

  if (count <= 0 || from.length === 0) return [];

  const flags = skillFlags(input.skills);

  const other = new Set<string>(input.otherSources);

  const own = flags.filter((s) => !other.has(s));

  const stray = own.find((s) => !from.includes(s));

  if (stray) return [choiceIssue("skills", "SKILL_NOT_ALLOWED", stray)];

  return own.length > count ? [choiceIssue("skills", "CHOICE_COUNT", `${own.length}/${count}`)] : [];
}
