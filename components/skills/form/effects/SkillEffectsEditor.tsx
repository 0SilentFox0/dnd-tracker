"use client";

import { memo, useCallback, useState } from "react";
import { Plus } from "lucide-react";

import { SkillEffectNewForm } from "./SkillEffectNewForm";
import { SkillEffectRow } from "./SkillEffectRow";
import { SkillEffectsSummary } from "./SkillEffectsSummary";
import { SkillEffectsTargeting } from "./SkillEffectsTargeting";

import { Button } from "@/components/ui/button";
import type { SkillEffect } from "@/types/battle";

export interface SkillEffectsEditorProps {
  effects: SkillEffect[];
  minTargets: string;
  maxTargets: string;
  onEffectsChange: (effects: SkillEffect[]) => void;
  onMinTargetsChange: (value: string) => void;
  onMaxTargetsChange: (value: string) => void;
}

function SkillEffectsEditorComponent({
  effects,
  minTargets,
  maxTargets,
  onEffectsChange,
  onMinTargetsChange,
  onMaxTargetsChange,
}: SkillEffectsEditorProps) {
  const [isAdding, setIsAdding] = useState(false);

  const updateEffect = useCallback(
    (index: number, field: keyof SkillEffect, value: unknown) => {
      const updated = effects.map((e, i) => {
        if (i !== index) return e;

        const copy = { ...e, [field]: value };

        if (field === "type") {
          copy.isPercentage = value === "percent";
        }

        return copy;
      });

      onEffectsChange(updated);
    },
    [effects, onEffectsChange],
  );

  const removeEffect = useCallback(
    (index: number) => {
      onEffectsChange(effects.filter((_, i) => i !== index));
    },
    [effects, onEffectsChange],
  );

  const addEffect = useCallback(
    (effect: SkillEffect) => {
      onEffectsChange([...effects, effect]);
      setIsAdding(false);
    },
    [effects, onEffectsChange],
  );

  return (
    <div className="rounded-md border p-4 space-y-4">
      <p className="text-sm font-semibold">Бойові ефекти</p>

      <SkillEffectsTargeting
        minTargets={minTargets}
        maxTargets={maxTargets}
        onMinTargetsChange={onMinTargetsChange}
        onMaxTargetsChange={onMaxTargetsChange}
      />

      {effects.length > 0 && (
        <div className="space-y-2">
          {effects.map((effect, index) => (
            <SkillEffectRow
              key={index}
              effect={effect}
              index={index}
              onUpdate={updateEffect}
              onRemove={removeEffect}
            />
          ))}
        </div>
      )}

      {effects.length === 0 && !isAdding && (
        <p className="text-sm text-muted-foreground">Ефектів не додано</p>
      )}

      {isAdding ? (
        <SkillEffectNewForm
          onAdd={addEffect}
          onCancel={() => setIsAdding(false)}
        />
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsAdding(true)}
        >
          <Plus className="mr-1 h-4 w-4" />
          Додати ефект
        </Button>
      )}

      <SkillEffectsSummary effects={effects} />
    </div>
  );
}

export const SkillEffectsEditor = memo(SkillEffectsEditorComponent);
