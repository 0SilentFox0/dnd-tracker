import { ABILITY_KEYS, type AbilityKey } from "@/lib/constants/abilities";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { DND_SKILLS, type DndSkill } from "@/lib/constants/skills";
import { isChoiceOpen, resolveChoiceCount } from "@/lib/utils/characters/choices/count";
import type { Choice, ChoiceErrorCode, ChoiceIssue, ChoiceOwner, ChoicePick, FeatData, Picks, SpellRef } from "@/types/choices";
import type { ClassColumn } from "@/types/classes";

export interface PickContext {
  owner: ChoiceOwner;
  level: number;
  totalLevel: number;
  columns?: readonly ClassColumn[];
  maxSlotLevel?: number;
  featsById: Readonly<Record<string, FeatData>>;
  spellsById: Readonly<Record<string, SpellRef>>;
  proficient: ReadonlySet<DndSkill>;
  scores: Readonly<Record<AbilityKey, number>>;
  featCounts: ReadonlyMap<string, number>;
}

export const choiceIssue = (path: string, code: ChoiceErrorCode, detail?: string): ChoiceIssue => ({ path, code, message: detail ? `${API_ERRORS[code]}: ${detail}` : API_ERRORS[code] });

export function featPrerequisiteMet(feat: FeatData, ctx: { totalLevel: number; scores: Readonly<Record<AbilityKey, number>> }): boolean {
  const { level, scores } = feat.prerequisite;

  return (!level || ctx.totalLevel >= level) && (!scores || scores.abilities.some((a) => ctx.scores[a] >= scores.min));
}

const duplicates = (picks: ChoicePick[]) => picks.length !== new Set(picks.map((p) => p.id)).size;

function optionIssues(choice: Choice, picks: ChoicePick[], ctx: PickContext, at: string): ChoiceIssue[] {
  const options = new Map((choice.options ?? []).map((o) => [o.id, o]));

  const picked = new Set(picks.map((p) => p.id));

  return picks.flatMap((p) => {
    const option = options.get(p.id);

    if (!option) return [choiceIssue(at, "CHOICE_UNKNOWN", p.id)];

    if (option.minLevel && option.minLevel > ctx.level) return [choiceIssue(at, "CHOICE_MIN_LEVEL", option.name)];

    return (option.requires ?? []).every((r) => picked.has(r)) ? [] : [choiceIssue(at, "CHOICE_REQUIRES", option.name)];
  });
}

function featIssues(choice: Choice, picks: ChoicePick[], ctx: PickContext, at: string): ChoiceIssue[] {
  const embedded = new Set((choice.options ?? []).map((o) => o.id));

  return picks.flatMap((p, i) => {
    if (embedded.has(p.id)) return [];

    const feat = ctx.featsById[p.id];

    if (!feat) return [choiceIssue(at, "CHOICE_UNKNOWN", p.id)];

    if (!(choice.featTypes ?? []).includes(feat.type)) return [choiceIssue(at, "FEAT_TYPE", feat.name)];

    if (!featPrerequisiteMet(feat, ctx)) return [choiceIssue(at, "FEAT_PREREQUISITE", feat.name)];

    if (!feat.repeatable && (ctx.featCounts.get(feat.id) ?? 0) > 1) return [choiceIssue(at, "FEAT_NOT_REPEATABLE", feat.name)];

    return validatePicks(feat.choices, p.picks ?? {}, { ...ctx, owner: "feat", level: ctx.totalLevel, columns: [] }, `${at}.${i}`);
  });
}

function skillIssues(choice: Choice, picks: ChoicePick[], ctx: PickContext, at: string): ChoiceIssue[] {
  const allowed = new Set<string>(choice.skills?.length ? choice.skills : DND_SKILLS);

  return picks.flatMap((p) => {
    if (!allowed.has(p.id)) return [choiceIssue(at, "SKILL_NOT_ALLOWED", p.id)];

    return choice.kind === "expertise" && !ctx.proficient.has(p.id as DndSkill) ? [choiceIssue(at, "EXPERTISE_NEEDS_PROFICIENCY", p.id)] : [];
  });
}

function spellIssues(choice: Choice, picks: ChoicePick[], ctx: PickContext, at: string): ChoiceIssue[] {
  const rule = choice.spells;

  if (!rule) return [];

  const max = rule.maxLevel === "slots" ? (ctx.maxSlotLevel ?? 0) : rule.maxLevel;

  return picks.flatMap((p) => {
    const spell = ctx.spellsById[p.id];

    if (!spell) return [choiceIssue(at, "CHOICE_UNKNOWN", p.id)];

    const listed = rule.lists.length === 0 || spell.lists.some((l) => rule.lists.includes(l));

    return listed && spell.level >= rule.minLevel && spell.level <= max ? [] : [choiceIssue(at, "SPELL_NOT_IN_LIST", spell.name)];
  });
}

function kindIssues(choice: Choice, picks: ChoicePick[], ctx: PickContext, at: string): ChoiceIssue[] {
  switch (choice.kind) {
    case "option":
      return optionIssues(choice, picks, ctx, at);
    case "feat":
      return featIssues(choice, picks, ctx, at);
    case "skill":
    case "expertise":
      return skillIssues(choice, picks, ctx, at);
    case "spell":
      return spellIssues(choice, picks, ctx, at);
    case "abilityScore": {
      const allowed = new Set<string>(choice.abilities ?? ABILITY_KEYS);

      const issues = picks.flatMap((p) => (allowed.has(p.id) ? [] : [choiceIssue(at, "CHOICE_UNKNOWN", p.id)]));

      const maxPerAbility = choice.maxPerAbility;

      if (maxPerAbility && [...new Set(picks.map((p) => p.id))].some((id) => picks.filter((p) => p.id === id).length > maxPerAbility)) issues.push(choiceIssue(at, "CHOICE_COUNT", choice.label));

      return issues;
    }
  }
}

export function validatePicks(choices: readonly Choice[], picks: Picks, ctx: PickContext, path: string): ChoiceIssue[] {
  const byId = new Map(choices.map((c) => [c.id, c]));

  return Object.entries(picks).flatMap(([choiceId, list]) => {
    const choice = byId.get(choiceId);

    const at = `${path}.${choiceId}`;

    if (!choice) return [choiceIssue(at, "CHOICE_UNKNOWN", choiceId)];

    if (!isChoiceOpen(choice, ctx.level, ctx.owner)) return [];

    const issues: ChoiceIssue[] = [];

    if (list.length > resolveChoiceCount(choice, ctx.level, ctx.columns)) issues.push(choiceIssue(at, "CHOICE_COUNT", choice.label));

    if (choice.kind !== "abilityScore" && duplicates(list)) issues.push(choiceIssue(at, "CHOICE_DUPLICATE", choice.label));

    return [...issues, ...kindIssues(choice, list, ctx, at)];
  });
}
