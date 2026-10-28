import { DND_SKILLS, type DndSkill, isDndSkill } from "@/lib/constants/skills";
import { classChoiceDefs } from "@/lib/utils/characters/choices/class-choices";
import { isChoiceOpen, resolveChoiceCount } from "@/lib/utils/characters/choices/count";
import { isRecord } from "@/lib/utils/common/is-record";
import { maxSlotLevelFor } from "@/lib/utils/spells/class-slots";
import type { Choice, ChoicePick, ChoiceRace, ChoicesState, FeatData, Picks, SpellRef } from "@/types/choices";
import type { ClassColumn, GameClassData } from "@/types/classes";

export interface ChoiceRefs {
  race: ChoiceRace | null;
  classesById: Readonly<Record<string, GameClassData>>;
  featsById: Readonly<Record<string, FeatData>>;
  spellsById: Readonly<Record<string, SpellRef>>;
}

export interface PickVisit {
  choice: Choice;
  picks: ChoicePick[];
  open: boolean;
  target: number;
  path: string;
  maxSlotLevel?: number;
}

type WalkRefs = Pick<ChoiceRefs, "race" | "classesById" | "featsById">;

export function visitPicks(state: ChoicesState, refs: WalkRefs, opts: { level: number; classMode: boolean }): PickVisit[] {
  const out: PickVisit[] = [];

  const visitFeat = (featId: string, picks: Picks | undefined, open: boolean, path: string) => {
    const feat = refs.featsById[featId];

    if (feat) visitList(feat.choices, picks ?? {}, { open, level: opts.level, columns: [], owner: "feat" }, path);
  };

  function visitList(defs: readonly Choice[], picks: Picks, at: { open: boolean; level: number; columns: readonly ClassColumn[]; owner: "race" | "class" | "feat"; maxSlotLevel?: number }, path: string) {
    for (const choice of defs) {
      const list = picks[choice.id] ?? [];

      const open = at.open && isChoiceOpen(choice, at.level, at.owner);

      const visitPath = `${path}.${choice.id}`;

      out.push({ choice, picks: list, open, target: resolveChoiceCount(choice, at.level, at.columns), path: visitPath, ...(at.maxSlotLevel !== undefined && { maxSlotLevel: at.maxSlotLevel }) });

      if (choice.kind === "feat") list.forEach((p, i) => visitFeat(p.id, p.picks, open, `${visitPath}.${i}`));
    }
  }

  visitList(refs.race?.choices ?? [], state.raceChoices, { open: true, level: opts.level, columns: [], owner: "race" }, "raceChoices");

  if (!opts.classMode) return out;

  for (const entry of state.classes) {
    const cls = refs.classesById[entry.classId];

    if (!cls) continue;

    const subclass = cls.subclasses.find((s) => s.id === entry.subclassId) ?? null;

    visitList(classChoiceDefs(cls, subclass), entry.choices ?? {}, { open: true, level: entry.level, columns: cls.columns ?? [], owner: "class", maxSlotLevel: maxSlotLevelFor({ ...entry, class: cls, subclass }) }, `classes.${entry.classId}`);
  }

  state.feats.forEach((f, i) => visitFeat(f.id, f.picks, true, `feats.${i}`));

  return out;
}

export function countFeats(visits: readonly PickVisit[], state: ChoicesState, classMode: boolean): Map<string, number> {
  const counts = new Map<string, number>();

  const add = (id: string) => counts.set(id, (counts.get(id) ?? 0) + 1);

  for (const v of visits) if (v.choice.kind === "feat") v.picks.forEach((p) => add(p.id));

  if (classMode) state.feats.forEach((f) => add(f.id));

  return counts;
}

export const skillPicksOf = (visits: readonly PickVisit[], kind: "skill" | "expertise"): DndSkill[] => [
  ...new Set(visits.filter((v) => v.open && v.choice.kind === kind).flatMap((v) => v.picks.map((p) => p.id).filter(isDndSkill))),
];

export const skillFlags = (raw: unknown): DndSkill[] => (isRecord(raw) ? DND_SKILLS.filter((k) => raw[k] === true) : []);
