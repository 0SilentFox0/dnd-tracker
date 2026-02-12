"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import {
  EFFECT_STAT_OPTIONS,
  EFFECT_TYPE_OPTIONS,
  isFlagValueType,
  isTextValueType,
} from "@/lib/constants/skill-effects";
import type { SkillEffect } from "@/types/battle";

const EMPTY_EFFECT: SkillEffect = {
  stat: "",
  type: "flat",
  value: 0,
  isPercentage: false,
};

export interface SkillEffectNewFormProps {
  onAdd: (effect: SkillEffect) => void;
  onCancel: () => void;
}

export function SkillEffectNewForm({ onAdd, onCancel }: SkillEffectNewFormProps) {
  const [draft, setDraft] = useState<SkillEffect>({ ...EMPTY_EFFECT });

  const isText = isTextValueType(draft.type);

  const isFlag = isFlagValueType(draft.type);

  const handleAdd = () => {
    if (!draft.stat) return;

    onAdd({ ...draft });
    setDraft({ ...EMPTY_EFFECT });
  };

  return (
    <div className="space-y-3 rounded-lg border border-dashed p-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <div className="space-y-1">
          <Label className="text-xs">Стат</Label>
          <SelectField
            value={draft.stat}
            onValueChange={(v) => setDraft((p) => ({ ...p, stat: v }))}
            placeholder="Оберіть стат"
            options={EFFECT_STAT_OPTIONS}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Тип</Label>
          <SelectField
            value={draft.type}
            onValueChange={(v) =>
              setDraft((p) => ({
                ...p,
                type: v,
                isPercentage: v === "percent",
                value: isFlagValueType(v) ? true : p.value,
              }))
            }
            placeholder="Тип"
            options={EFFECT_TYPE_OPTIONS}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Значення</Label>
          {isFlag ? (
            <Input value="✓" disabled className="bg-muted" />
          ) : (
            <Input
              type={isText ? "text" : "number"}
              value={String(draft.value ?? "")}
              onChange={(e) => {
                const val = isText
                  ? e.target.value
                  : e.target.value === ""
                    ? 0
                    : parseFloat(e.target.value);

                setDraft((p) => ({ ...p, value: val }));
              }}
              placeholder={isText ? "1d4" : "0"}
            />
          )}
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Раунди</Label>
          <Input
            type="number"
            value={draft.duration ?? ""}
            onChange={(e) =>
              setDraft((p) => ({
                ...p,
                duration:
                  e.target.value === ""
                    ? undefined
                    : parseInt(e.target.value, 10),
              }))
            }
            placeholder="—"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          onClick={handleAdd}
          disabled={!draft.stat}
        >
          Додати
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Скасувати
        </Button>
      </div>
    </div>
  );
}
