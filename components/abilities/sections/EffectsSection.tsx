"use client";

import { useTranslations } from "next-intl";

import type { AbilitySectionProps } from "../AbilityPanel";
import { useAbilityEditor } from "../editor-context";
import { EffectCard } from "../EffectCard";
import { FieldErrors } from "../FieldErrors";
import { SectionShell } from "./SectionShell";
import { SectionTitle } from "./SectionTitle";

import { Button } from "@/components/ui/button";
import { allowedEffectKinds, newEffect } from "@/lib/utils/abilities/editor";
import type { Effect } from "@/lib/utils/abilities/schema";

export function EffectsSection({ ability, path, onChange }: AbilitySectionProps) {
  const t = useTranslations("abilities.effects");

  const { errorsByPath } = useAbilityEditor();

  const setEffects = (effects: Effect[]) => onChange({ ...ability, effects });

  return (
    <SectionShell path={path} part="then">
      <SectionTitle>{t("title")}</SectionTitle>
      <FieldErrors errors={errorsByPath[`${path}.effects`] ?? []} />
      {ability.effects.map((effect, i) => (
        <div key={i} className="space-y-1">
          <FieldErrors errors={errorsByPath[`${path}.effects.${i}`] ?? []} />
          <EffectCard
            effect={effect}
            trigger={ability.trigger}
            path={`${path}.effects.${i}`}
            actions={{
              onChange: (next) => setEffects(ability.effects.map((x, j) => (j === i ? next : x))),
              onRemove: () => setEffects(ability.effects.filter((_, j) => j !== i)),
            }}
          />
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" onClick={() => setEffects([...ability.effects, newEffect(allowedEffectKinds(ability.trigger)[0], ability.trigger)])}>
        {t("add")}
      </Button>
    </SectionShell>
  );
}
