"use client";

import { useState } from "react";

import { useCharacterChoices } from "./useCharacterChoices";
import type { ChoiceRefsView } from "./useChoiceRefs";

import type { AbilityKey } from "@/lib/constants/abilities";
import { choicesBodyOf } from "@/lib/utils/characters/choices/picks";
import { prunePicks } from "@/lib/utils/characters/choices/prune";
import { type WizardStep, wizardSteps } from "@/lib/utils/characters/choices/wizard";
import type { Character } from "@/types/characters";
import type { ChoicesState } from "@/types/choices";

interface ChoiceWizardOptions {
  campaignId: string;
  characterId: string;
  initial: ChoicesState;
  hero: { level: number; scores: Record<AbilityKey, number>; skills: unknown; classMode: boolean };
  refs: ChoiceRefsView;
  startAt?: string;
  onSaved?: (updated: Character) => void;
  onFinish?: () => void;
}

const startIndex = (steps: WizardStep[], startAt?: string) => {
  const found = startAt ? steps.findIndex((s) => (startAt === "subclass" ? s.kind === "subclass" : s.choice?.id === startAt)) : -1;

  return Math.max(found, 0);
};

export function useChoiceWizard({ campaignId, characterId, initial, hero, refs, startAt, onSaved, onFinish }: ChoiceWizardOptions) {
  const [data, setData] = useState(initial);

  const [saved, setSaved] = useState(initial);

  const [seen, setSeen] = useState(() => wizardSteps(initial, refs, hero).map((s) => s.key));

  const [index, setIndex] = useState(() => startIndex(wizardSteps(initial, refs, hero), startAt));

  const choices = useCharacterChoices({ campaignId, characterId, onSaved });

  const fresh = wizardSteps(data, refs, hero, new Set(seen));

  const byKey = new Map(fresh.map((s) => [s.key, s]));

  const steps = [...seen.flatMap((k) => byKey.get(k) ?? []), ...fresh.filter((s) => !seen.includes(s.key))];

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

  return { steps, index, step: steps[index] as WizardStep | undefined, state: { data, set }, saved, next, back, isPending: choices.isPending, error: choices.error, issues: choices.issues, done: steps.length === 0 };
}
