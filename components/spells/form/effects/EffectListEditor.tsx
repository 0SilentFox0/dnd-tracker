"use client";

import { EffectCard } from "@/components/abilities/EffectCard";
import { NestedEffectsEditor } from "@/components/abilities/NestedEffectsEditor";
import { allowedEffectKinds, newEffect } from "@/lib/utils/abilities/editor";
import type { Effect, NonRandomEffect } from "@/lib/utils/abilities/schema";
import { SPELL_EFFECT_TRIGGER } from "@/lib/utils/spells/editor/spell-only";

const KINDS = allowedEffectKinds(SPELL_EFFECT_TRIGGER).filter((k) => k !== "randomOf");

interface EffectListEditorProps {
  effects: NonRandomEffect[];
  path: string;
  limits: { min: number; max?: number };
  labels: { heading?: string; add: string };
  onChange: (effects: NonRandomEffect[]) => void;
}

export function EffectListEditor({ effects, path, limits, labels, onChange }: EffectListEditorProps) {
  return (
    <NestedEffectsEditor
      effects={effects}
      path={path}
      limits={limits}
      labels={labels}
      create={() => newEffect("heal", SPELL_EFFECT_TRIGGER) as NonRandomEffect}
      onChange={onChange}
      renderCard={({ effect, path: cardPath, actions }) => (
        <EffectCard effect={effect as Effect} trigger={SPELL_EFFECT_TRIGGER} path={cardPath} kinds={KINDS} actions={{ ...actions, onChange: (next) => actions.onChange(next as NonRandomEffect) }} />
      )}
    />
  );
}
