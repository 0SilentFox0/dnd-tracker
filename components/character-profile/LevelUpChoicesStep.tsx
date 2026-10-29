"use client";

import { useTranslations } from "next-intl";

import { ChoicesEditor } from "@/components/choices/ChoicesEditor";
import { LoadingState } from "@/components/common/states";
import type { AbilityKey } from "@/lib/constants/abilities";
import { useChoiceRefs } from "@/lib/hooks/characters";
import type { Picks } from "@/types/choices";
import type { CharacterClassEntry } from "@/types/classes";

interface LevelUpChoicesStepProps {
  campaignId: string;
  hero: { race: string; level: number; scores: Record<AbilityKey, number>; skills: unknown };
  entry: CharacterClassEntry;
  multiclass: boolean;
  value: Picks;
  onChange: (next: Picks) => void;
}

export function LevelUpChoicesStep({ campaignId, hero, entry, multiclass, value, onChange }: LevelUpChoicesStepProps) {
  const t = useTranslations("characterProfile.levelUp");

  const refs = useChoiceRefs(campaignId, hero.race);

  if (!refs.ready) return <LoadingState rows={2} label={t("loadingChoices")} />;

  const merged = { ...entry, choices: { ...(entry.choices ?? {}), ...value } };

  return (
    <div className="space-y-2">
      <p className="hud-sc text-sm text-hud-ink">{t("choices")}</p>
      <ChoicesEditor
        state={{
          data: { raceChoices: {}, feats: [], classes: [merged] },
          set: (next) => {
            const picks = next.classes[0]?.choices ?? {};

            onChange(Object.fromEntries(Object.entries(picks).filter(([id, list]) => JSON.stringify(list) !== JSON.stringify(entry.choices?.[id] ?? []))));
          },
        }}
        refs={refs}
        saved={{ raceChoices: {}, feats: [], classes: [entry] }}
        hero={{ ...hero, level: hero.level + 1, classMode: true }}
        only={{ classId: entry.classId, level: entry.level, multiclass }}
      />
    </div>
  );
}
