"use client";

import { useMemo, useState } from "react";

import { useCharacterChoices } from "./useCharacterChoices";
import type { ChoiceRefsView } from "./useChoiceRefs";

import { choicesBodyOf } from "@/lib/utils/characters/choices/picks";
import { prunePicks } from "@/lib/utils/characters/choices/prune";
import { type WizardStep, wizardSteps } from "@/lib/utils/characters/choices/wizard";
import type { Character } from "@/types/characters";
import type { ChoiceHero, ChoicesState } from "@/types/choices";

interface ChoiceWizardOptions {
  campaignId: string;
  characterId: string;
  initial: ChoicesState;
  hero: ChoiceHero;
  refs: ChoiceRefsView;
  startAt?: string;
  onSaved?: (updated: Character) => void;
  onFinish?: () => void;
}

const startIndex = (steps: WizardStep[], startAt?: string) => {
  const found = startAt ? steps.findIndex((s) => s.key === startAt) : -1;

  return Math.max(found, 0);
};

export function useChoiceWizard({ campaignId, characterId, initial, hero, refs, startAt, onSaved, onFinish }: ChoiceWizardOptions) {
  const [data, setData] = useState(initial);

  const [saved, setSaved] = useState(initial);

  const [initialSteps] = useState(() => wizardSteps(initial, refs, hero, new Set(startAt ? [startAt] : [])));

  const [missingStart] = useState(() => startAt === "background" && !initialSteps.some((s) => s.key === startAt));

  const [seen, setSeen] = useState(() => initialSteps.map((s) => s.key));

  const [index, setIndex] = useState(() => startIndex(initialSteps, startAt));

  const choices = useCharacterChoices({ campaignId, characterId, onSaved });

  const { level, classMode } = hero;

  const steps = useMemo(() => {
    const seenSet = new Set(seen);

    const fresh = wizardSteps(data, refs, { level, classMode }, seenSet);

    const byKey = new Map(fresh.map((s) => [s.key, s]));

    const ordered = [...seen.flatMap((k) => byKey.get(k) ?? []), ...fresh.filter((s) => !seenSet.has(s.key))];

    const own = (s: WizardStep) => s.path === "backgroundChoices" || s.path === "backgroundFeatPicks";

    const at = ordered.findIndex((s) => s.kind === "background");

    if (at < 0) return ordered;

    return [...ordered.slice(0, at + 1), ...ordered.filter(own), ...ordered.slice(at + 1).filter((s) => !own(s))];
  }, [data, refs, level, classMode, seen]);

  const set = (next: ChoicesState) => {
    setData(next);
    choices.clear();
  };

  const next = async () => {
    const pruned = prunePicks(data, refs).state;

    if (!(await choices.save(choicesBodyOf(pruned)))) return;

    setData(pruned);
    setSaved(pruned);
    setSeen(steps.map((s) => s.key));

    if (index >= steps.length - 1) onFinish?.();
    else setIndex(index + 1);
  };

  const back = () => setIndex(Math.max(0, index - 1));

  return { steps, index, step: missingStart ? undefined : (steps[index] as WizardStep | undefined), state: { data, set }, saved, next, back, isPending: choices.isPending, error: choices.error, issues: choices.issues, done: steps.length === 0 };
}
