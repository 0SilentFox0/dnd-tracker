"use client";

import { ChoicesEditor } from "./ChoicesEditor";

import { LoadingState } from "@/components/common/states";
import { ABILITY_KEYS, type AbilityKey } from "@/lib/constants/abilities";
import { useChoiceRefs } from "@/lib/hooks/characters";
import { backgroundFields } from "@/lib/utils/backgrounds/selection";
import type { CharacterFormData } from "@/types/characters";
import type { ChoicesState } from "@/types/choices";

interface CharacterChoicesTabProps {
  campaignId: string;
  form: { data: CharacterFormData; set: React.Dispatch<React.SetStateAction<CharacterFormData>> };
  classesEnabled: boolean;
}

export function CharacterChoicesTab({ campaignId, form: { data, set }, classesEnabled }: CharacterChoicesTabProps) {
  const refs = useChoiceRefs(campaignId, data.basicInfo.race);

  const classes = (data.basicInfo.classes ?? []).filter((e) => e.classId);

  const state: ChoicesState = { ...backgroundFields(data.choices ?? {}), raceChoices: data.choices?.raceChoices ?? {}, feats: data.choices?.feats ?? [], classes };

  const scores = Object.fromEntries(ABILITY_KEYS.map((k) => [k, data.abilityScores[k]])) as Record<AbilityKey, number>;

  if (!refs.ready) return <LoadingState rows={3} label="Завантаження виборів…" />;

  return (
    <ChoicesEditor
      state={{
        data: state,
        set: (next) => set((prev) => ({ ...prev, choices: { ...backgroundFields(next), raceChoices: next.raceChoices, feats: next.feats }, basicInfo: { ...prev.basicInfo, classes: next.classes } })),
      }}
      refs={refs}
      hero={{ level: data.basicInfo.level, scores, skills: data.skills.skills, classMode: classesEnabled && classes.length > 0 }}
    />
  );
}
