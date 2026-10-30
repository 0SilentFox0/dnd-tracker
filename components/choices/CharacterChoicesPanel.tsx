"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { ChoicesEditor } from "./ChoicesEditor";

import { LoadingState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import type { AbilityKey } from "@/lib/constants/abilities";
import { useCharacterChoices, useChoiceRefs } from "@/lib/hooks/characters";
import { choicesBodyOf } from "@/lib/utils/characters/choices/picks";
import { prunePicks } from "@/lib/utils/characters/choices/prune";
import type { Character } from "@/types/characters";
import type { ChoicesState } from "@/types/choices";

interface CharacterChoicesPanelProps {
  campaignId: string;
  characterId: string;
  initial: ChoicesState;
  hero: { race: string; level: number; scores: Record<AbilityKey, number>; skills: unknown; classMode: boolean };
  onSaved?: (updated: Character) => void;
}

export function CharacterChoicesPanel({ campaignId, characterId, initial, hero, onSaved }: CharacterChoicesPanelProps) {
  const t = useTranslations("choices");

  const tc = useTranslations("common");

  const refs = useChoiceRefs(campaignId, hero.race);

  const [data, set] = useState<ChoicesState>(initial);

  const choices = useCharacterChoices({ campaignId, characterId, onSaved });

  if (!refs.ready) return <LoadingState rows={3} label={t("editor.loading")} />;

  const edit = (next: ChoicesState) => {
    set(next);
    choices.clear();
  };

  const submit = () => void choices.save(choicesBodyOf(prunePicks(data, refs).state));

  return (
    <div className="space-y-4">
      <ChoicesEditor state={{ data, set: edit }} refs={refs} hero={hero} saved={initial} issues={choices.issues} />
      {choices.error && (
        <p role="alert" className="text-sm text-hud-danger">
          {choices.error}
        </p>
      )}
      <Button type="button" onClick={submit} disabled={choices.isPending}>
        {choices.isPending ? tc("actions.saving") : t("editor.save")}
      </Button>
    </div>
  );
}
