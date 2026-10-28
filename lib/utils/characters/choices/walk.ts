import { DND_SKILLS, type DndSkill, isDndSkill } from "@/lib/constants/skills";
import { classChoiceDefs } from "@/lib/utils/characters/choices/class-choices";
import { isChoiceOpen, resolveChoiceCount } from "@/lib/utils/characters/choices/count";
import { isRecord } from "@/lib/utils/common/is-record";
import { maxSlotLevelFor } from "@/lib/utils/spells/class-slots";
import type { BackgroundData } from "@/types/backgrounds";
import type { CharacterFeat, Choice, ChoiceOwner, ChoicePick, ChoiceRace, ChoicesState, FeatData, Picks, SpellRef } from "@/types/choices";
import type { CharacterClassEntry, ClassColumn, GameClassData, ResolvedClassEntry, Subclass } from "@/types/classes";

export interface ChoiceRefs {
  backgroundsById?: Readonly<Record<string, BackgroundData>>;
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

type WalkRefs = Pick<ChoiceRefs, "race" | "classesById" | "featsById" | "backgroundsById">;

export type ChoiceOwnerRef =
  | { kind: "race"; race: ChoiceRace }
  | { kind: "background"; background: BackgroundData }
  | { kind: "backgroundFeat"; background: BackgroundData; feat: FeatData }
  | { kind: "class"; entry: CharacterClassEntry; cls: GameClassData; subclass: Subclass | null }
  | { kind: "feat"; entry: CharacterFeat; feat: FeatData; index: number };

export interface ChoiceOwnerVisit {
  owner: ChoiceOwnerRef;
  choiceOwner: ChoiceOwner;
  defs: readonly Choice[];
  picks: Picks;
  level: number;
  columns: readonly ClassColumn[];
  /** state path (`raceChoices`, `classes.<id>`, `feats.<i>`) */
  path: string;
  /** grant/ability source path (`race`, `class:<id>`, `feat:<i>`) */
  legacyPath: string;
}

export interface ChoiceWalkState {
  raceChoices: Picks;
  backgroundId?: string | null;
  backgroundChoices?: Picks;
  backgroundFeatPicks?: Picks;
  classes: readonly CharacterClassEntry[];
  feats: readonly CharacterFeat[];
}

/** Race → background (+ origin feat) → classes → feats; owners with a missing definition are skipped. */
export function forEachChoiceOwner(state: ChoiceWalkState, refs: WalkRefs, visit: (v: ChoiceOwnerVisit) => void, opts: { level: number; classMode: boolean }): void {
  const { level } = opts;

  if (refs.race) visit({ owner: { kind: "race", race: refs.race }, choiceOwner: "race", defs: refs.race.choices, picks: state.raceChoices, level, columns: [], path: "raceChoices", legacyPath: "race" });

  if (!opts.classMode) return;

  const background = state.backgroundId ? refs.backgroundsById?.[state.backgroundId] : null;

  if (background) {
    visit({ owner: { kind: "background", background }, choiceOwner: "background", defs: background.choices, picks: state.backgroundChoices ?? {}, level, columns: [], path: "backgroundChoices", legacyPath: `background:${background.id}` });

    const feat = background.originFeatId ? refs.featsById[background.originFeatId] : undefined;

    if (feat) visit({ owner: { kind: "backgroundFeat", background, feat }, choiceOwner: "feat", defs: feat.choices, picks: state.backgroundFeatPicks ?? {}, level, columns: [], path: "backgroundFeatPicks", legacyPath: `background:${background.id}:feat:${feat.id}` });
  }

  for (const entry of state.classes) {
    const cls = refs.classesById[entry.classId];

    if (!cls) continue;

    const subclass = "subclass" in entry ? (entry as ResolvedClassEntry).subclass : (cls.subclasses.find((s) => s.id === entry.subclassId) ?? null);

    visit({ owner: { kind: "class", entry, cls, subclass }, choiceOwner: "class", defs: classChoiceDefs(cls, subclass), picks: entry.choices ?? {}, level: entry.level, columns: cls.columns ?? [], path: `classes.${entry.classId}`, legacyPath: `class:${entry.classId}` });
  }

  state.feats.forEach((entry, index) => {
    const feat = refs.featsById[entry.id];

    if (feat) visit({ owner: { kind: "feat", entry, feat, index }, choiceOwner: "feat", defs: feat.choices, picks: entry.picks ?? {}, level, columns: [], path: `feats.${index}`, legacyPath: `feat:${index}` });
  });
}

export function visitPicks(state: ChoicesState, refs: WalkRefs, opts: { level: number; classMode: boolean }): PickVisit[] {
  const out: PickVisit[] = [];

  const visitFeat = (featId: string, picks: Picks | undefined, open: boolean, path: string) => {
    const feat = refs.featsById[featId];

    if (feat) visitList(feat.choices, picks ?? {}, { open, level: opts.level, columns: [], owner: "feat" }, path);
  };

  function visitList(defs: readonly Choice[], picks: Picks, at: { open: boolean; level: number; columns: readonly ClassColumn[]; owner: ChoiceOwner; maxSlotLevel?: number }, path: string) {
    for (const choice of defs) {
      const list = picks[choice.id] ?? [];

      const open = at.open && isChoiceOpen(choice, at.level, at.owner);

      const visitPath = `${path}.${choice.id}`;

      out.push({ choice, picks: list, open, target: resolveChoiceCount(choice, at.level, at.columns), path: visitPath, ...(at.maxSlotLevel !== undefined && { maxSlotLevel: at.maxSlotLevel }) });

      if (choice.kind === "feat") list.forEach((p, i) => visitFeat(p.id, p.picks, open, `${visitPath}.${i}`));
    }
  }

  forEachChoiceOwner(state, refs, ({ owner, choiceOwner, defs, picks, level, columns, path }) => {
    const maxSlotLevel = owner.kind === "class" ? maxSlotLevelFor({ ...owner.entry, class: owner.cls, subclass: owner.subclass }) : undefined;

    visitList(defs, picks, { open: true, level, columns, owner: choiceOwner, ...(maxSlotLevel !== undefined && { maxSlotLevel }) }, path);
  }, opts);

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
