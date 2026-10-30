import { isChoiceOpen, resolveChoiceCount } from "@/lib/utils/characters/choices/count";
import { resolvedPickCount } from "@/lib/utils/characters/choices/pending";
import { type ChoiceOwnerRef, forEachChoiceOwner, type WalkRefs } from "@/lib/utils/characters/choices/walk";
import type { Choice, ChoicePick, ChoicesState, Picks } from "@/types/choices";

export type StepSource = { owner: "race" | "background" | "backgroundFeat" | "class" | "feat"; name: string; level?: number };

export interface WizardStep {
  key: string;
  kind: "choice" | "subclass";
  source: StepSource;
  /** state path of the owner (`raceChoices`, `classes.<id>`, `feats.<i>`) */
  path: string;
  choice?: Choice;
  classId?: string;
}

const ownerName = (owner: ChoiceOwnerRef): string => {
  switch (owner.kind) {
    case "race":
      return owner.race.name;
    case "background":
      return owner.background.name;
    case "class":
      return owner.cls.name;
    default:
      return owner.feat.name;
  }
};

export function wizardSteps(state: ChoicesState, refs: WalkRefs, hero: { level: number; classMode: boolean }, keep?: ReadonlySet<string>): WizardStep[] {
  const steps: WizardStep[] = [];

  forEachChoiceOwner(state, refs, ({ owner, choiceOwner, defs, picks, level, columns, path }) => {
    const name = ownerName(owner);

    if (owner.kind === "class") {
      const { cls, entry } = owner;

      const key = `subclass:${entry.classId}`;

      const needed = cls.subclassLevel !== null && entry.level >= cls.subclassLevel && !entry.subclassId && cls.subclasses.length > 0;

      if (needed || keep?.has(key)) steps.push({ key, kind: "subclass", source: { owner: "class", name, ...(cls.subclassLevel !== null && { level: cls.subclassLevel }) }, path, classId: entry.classId });
    }

    for (const choice of defs) {
      const key = `${path}.${choice.id}`;

      const open = isChoiceOpen(choice, level, choiceOwner) && resolvedPickCount(choice, picks[choice.id] ?? [], refs.featsById) < resolveChoiceCount(choice, level, columns);

      if (open || keep?.has(key)) steps.push({ key, kind: "choice", source: { owner: owner.kind, name, ...(owner.kind === "class" && { level: choice.level }) }, path, choice, ...(owner.kind === "class" && { classId: owner.entry.classId }) });
    }
  }, hero);

  return steps;
}

export const picksAtStep = (state: ChoicesState, step: WizardStep): ChoicePick[] => (step.choice ? (ownerPicks(state, step)[step.choice.id] ?? []) : []);

function ownerPicks(state: ChoicesState, step: WizardStep): Picks {
  const { path } = step;

  if (path === "raceChoices") return state.raceChoices;

  if (path === "backgroundChoices") return state.backgroundChoices ?? {};

  if (path === "backgroundFeatPicks") return state.backgroundFeatPicks ?? {};

  if (step.classId) return state.classes.find((e) => e.classId === step.classId)?.choices ?? {};

  return state.feats[Number(path.slice("feats.".length))]?.picks ?? {};
}

export function withStepPicks(state: ChoicesState, step: WizardStep, list: ChoicePick[]): ChoicesState {
  if (!step.choice) return state;

  const id = step.choice.id;

  const write = (picks: Picks): Picks => ({ ...picks, [id]: list });

  const { path } = step;

  if (path === "raceChoices") return { ...state, raceChoices: write(state.raceChoices) };

  if (path === "backgroundChoices") return { ...state, backgroundChoices: write(state.backgroundChoices ?? {}) };

  if (path === "backgroundFeatPicks") return { ...state, backgroundFeatPicks: write(state.backgroundFeatPicks ?? {}) };

  if (step.classId) return { ...state, classes: state.classes.map((e) => (e.classId === step.classId ? { ...e, choices: write(e.choices ?? {}) } : e)) };

  const index = Number(path.slice("feats.".length));

  return { ...state, feats: state.feats.map((f, i) => (i === index ? { ...f, picks: write(f.picks ?? {}) } : f)) };
}

export const withStepSubclass = (state: ChoicesState, step: WizardStep, subclassId: string): ChoicesState =>
  step.kind === "subclass" ? { ...state, classes: state.classes.map((e) => (e.classId === step.classId ? { ...e, subclassId } : e)) } : state;
