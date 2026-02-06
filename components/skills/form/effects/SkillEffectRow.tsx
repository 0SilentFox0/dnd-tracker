"use client";

import { Trash2 } from "lucide-react";

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

export interface SkillEffectRowProps {
  effect: SkillEffect;
  index: number;
  onUpdate: (index: number, field: keyof SkillEffect, value: unknown) => void;
  onRemove: (index: number) => void;
}

export function SkillEffectRow({
  effect,
  index,
  onUpdate,
  onRemove,
}: SkillEffectRowProps) {
  const isText = isTextValueType(effect.type);

  const isFlag = isFlagValueType(effect.type);

  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-2">
      <div className="grid flex-1 grid-cols-2 gap-2 md:grid-cols-5">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Стат</Label>
          <SelectField
            value={effect.stat}
            onValueChange={(v) => onUpdate(index, "stat", v)}
            placeholder="Стат"
            options={EFFECT_STAT_OPTIONS}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Тип</Label>
          <SelectField
            value={effect.type}
            onValueChange={(v) => onUpdate(index, "type", v)}
            placeholder="Тип"
            options={EFFECT_TYPE_OPTIONS}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Значення</Label>
          {isFlag ? (
            <Input value="✓" disabled className="bg-muted" />
          ) : (
            <Input
              type={isText ? "text" : "number"}
              value={String(effect.value ?? "")}
              onChange={(e) => {
                const val = isText
                  ? e.target.value
                  : e.target.value === ""
                    ? 0
                    : parseFloat(e.target.value);

                onUpdate(index, "value", val);
              }}
              placeholder={isText ? "2*hero_level" : "0"}
            />
          )}
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Раунди</Label>
          <Input
            type="number"
            value={effect.duration ?? ""}
            onChange={(e) =>
              onUpdate(
                index,
                "duration",
                e.target.value === ""
                  ? undefined
                  : parseInt(e.target.value, 10),
              )
            }
            placeholder="—"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Разів</Label>
          <SelectField
            value={
              effect.maxTriggers == null || effect.maxTriggers === 0
                ? "unlimited"
                : String(effect.maxTriggers)
            }
            onValueChange={(v) =>
              onUpdate(
                index,
                "maxTriggers",
                v === "unlimited" || v === ""
                  ? null
                  : parseInt(v, 10),
              )
            }
            placeholder="Постійно"
            options={[
              { value: "unlimited", label: "Постійно" },
              ...Array.from({ length: 100 }, (_, i) => ({
                value: String(i + 1),
                label: String(i + 1),
              })),
            ]}
            triggerClassName="min-w-0"
          />
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0 text-destructive hover:text-destructive/80"
        onClick={() => onRemove(index)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
