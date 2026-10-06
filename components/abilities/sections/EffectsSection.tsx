"use client";

import type { AbilitySectionProps } from "../AbilityPanel";
import { useAbilityEditor } from "../editor-context";
import { EffectCard } from "../EffectCard";
import { SectionTitle } from "./SectionTitle";

import { Button } from "@/components/ui/button";
import { allowedEffectKinds, newEffect } from "@/lib/utils/abilities/editor";
import type { Effect } from "@/lib/utils/abilities/schema";

export function EffectsSection({ ability, path, onChange }: AbilitySectionProps) {
  const { errorsByPath } = useAbilityEditor();

  const setEffects = (effects: Effect[]) => onChange({ ...ability, effects });

  return (
    <div className="space-y-2">
      <SectionTitle>Що робить</SectionTitle>
      {(errorsByPath[`${path}.effects`] ?? []).map((e) => (
        <p key={e} className="text-xs text-destructive">
          {e}
        </p>
      ))}
      {ability.effects.map((effect, i) => (
        <div key={i} className="space-y-1">
          {(errorsByPath[`${path}.effects.${i}`] ?? []).map((e) => (
            <p key={e} className="text-xs text-destructive">
              {e}
            </p>
          ))}
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
        + ефект
      </Button>
    </div>
  );
}
