import type { AbilityKey } from "@/lib/constants/abilities";
import { abilityPicksOf, abilityScoreDelta, applyDelta, capIssues } from "@/lib/utils/characters/choices/ability";
import { classChoiceDefs } from "@/lib/utils/characters/choices/class-choices";
import { lineageName } from "@/lib/utils/characters/choices/picks";
import { hasPicks } from "@/lib/utils/characters/choices/read";
import { choiceIssue, type PickContext, validatePicks } from "@/lib/utils/characters/choices/validate";
import { type ChoiceRefs, countFeats, skillFlags, skillPicksOf, visitPicks } from "@/lib/utils/characters/choices/walk";
import { maxSlotLevelFor } from "@/lib/utils/spells/class-slots";
import type { Choice, ChoiceErrorCode, ChoiceIssue, ChoicesState, Picks } from "@/types/choices";

export interface PlanInput {
  before: ChoicesState;
  after: ChoicesState;
  refs: ChoiceRefs;
  classMode: boolean;
  isDM: boolean;
  level: number;
  scores: Record<AbilityKey, number>;
  skills: unknown;
}

export type PlanResult =
  | { ok: true; state: ChoicesState; subrace: string | null | undefined; scores: Partial<Record<AbilityKey, number>> }
  | { ok: false; status: 403 | 422; code: ChoiceErrorCode; message: string; issues: ChoiceIssue[] };

const failWith = (status: 403 | 422, issues: ChoiceIssue[]): PlanResult => ({ ok: false, status, code: issues[0].code, message: issues[0].message, issues });

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? []) === JSON.stringify(b ?? []);

function lockedIssues(defs: readonly Choice[], before: Picks, after: Picks, level: number, path: string): ChoiceIssue[] {
  return defs.filter((c) => c.level > level && !same(before[c.id], after[c.id])).map((c) => choiceIssue(`${path}.${c.id}`, "CHOICE_LOCKED", c.label));
}

export function planChoices(input: PlanInput): PlanResult {
  const { before, after, refs, classMode, level } = input;

  if (!classMode && (after.feats.length > 0 || after.classes.some((e) => hasPicks(e.choices)))) return failWith(422, [choiceIssue("feats", "CHOICES_NEED_CLASSES")]);

  const dmFeats = (s: ChoicesState) => s.feats.filter((f) => f.source === "dm");

  if (!input.isDM && !same(dmFeats(before), dmFeats(after))) return failWith(403, [choiceIssue("feats", "DM_FEAT_ONLY_DM")]);

  if (after.feats.filter((f) => f.source === "origin").length > 1) return failWith(422, [choiceIssue("feats", "ORIGIN_FEAT_ONLY_ONE")]);

  const opts = { level, classMode };

  const visits = visitPicks(after, refs, opts);

  const featCounts = countFeats(visits, after, classMode);

  const base: Omit<PickContext, "owner" | "level"> = {
    totalLevel: level,
    featsById: refs.featsById,
    spellsById: refs.spellsById,
    proficient: new Set([...skillFlags(input.skills), ...skillPicksOf(visits, "skill")]),
    scores: input.scores,
    featCounts,
  };

  const raceDefs = refs.race?.choices ?? [];

  const issues: ChoiceIssue[] = [
    ...lockedIssues(raceDefs, before.raceChoices, after.raceChoices, level, "raceChoices"),
    ...validatePicks(raceDefs, after.raceChoices, { ...base, owner: "race", level }, "raceChoices"),
  ];

  for (const entry of classMode ? after.classes : []) {
    const cls = refs.classesById[entry.classId];

    if (!cls) continue;

    const subclass = cls.subclasses.find((s) => s.id === entry.subclassId) ?? null;

    const defs = classChoiceDefs(cls, subclass);

    const path = `classes.${entry.classId}`;

    const stored = before.classes.find((e) => e.classId === entry.classId)?.choices ?? {};

    issues.push(
      ...lockedIssues(defs, stored, entry.choices ?? {}, entry.level, path),
      ...validatePicks(defs, entry.choices ?? {}, { ...base, owner: "class", level: entry.level, columns: cls.columns ?? [], maxSlotLevel: maxSlotLevelFor({ ...entry, class: cls, subclass }) }, path),
    );
  }

  after.feats.forEach((f, i) => {
    const feat = refs.featsById[f.id];

    const path = `feats.${i}`;

    if (!feat) return void issues.push(choiceIssue(path, "CHOICE_UNKNOWN", f.id));

    if (f.source === "origin" && feat.type !== "origin") issues.push(choiceIssue(path, "FEAT_TYPE", feat.name));

    if (!feat.repeatable && (featCounts.get(f.id) ?? 0) > 1) issues.push(choiceIssue(path, "FEAT_NOT_REPEATABLE", feat.name));

    issues.push(...validatePicks(feat.choices, f.picks ?? {}, { ...base, owner: "feat", level }, path));
  });

  const afterPicks = abilityPicksOf(visits);

  const beforePicks = abilityPicksOf(visitPicks(before, refs, opts));

  const delta = abilityScoreDelta(beforePicks, afterPicks);

  issues.push(...capIssues(input.scores, delta, afterPicks, beforePicks));

  if (issues.length > 0) return failWith(422, issues);

  return { ok: true, state: after, subrace: lineageName(refs.race, after.raceChoices), scores: applyDelta(input.scores, delta) };
}
