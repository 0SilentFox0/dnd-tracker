"use client";

import { X } from "lucide-react";

import { ConditionSection } from "./sections/ConditionSection";
import { EffectsSection } from "./sections/EffectsSection";
import { LimitsSection } from "./sections/LimitsSection";
import { TriggerSection } from "./sections/TriggerSection";
import { useErrorsUnder } from "./editor-context";
import { FieldErrors } from "./FieldErrors";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { describeAbility } from "@/lib/utils/abilities/registry/effects";
import type { Ability } from "@/lib/utils/abilities/schema";

export interface AbilitySectionProps {
  ability: Ability;
  path: string;
  onChange: (next: Ability) => void;
}

export function AbilityPanel({ ability, path, actions }: { ability: Ability; path: string; actions: { onChange: (a: Ability) => void; onRemove: () => void } }) {
  const section = { ability, path, onChange: actions.onChange };

  const nameErrors = useErrorsUnder(`${path}.name`);

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <Label htmlFor={`${path}.name`} className="text-xs text-muted-foreground">
            Назва
          </Label>
          <Input id={`${path}.name`} value={ability.name} onChange={(e) => actions.onChange({ ...ability, name: e.target.value })} />
          <FieldErrors errors={nameErrors} testId={`field-errors-${path}.name`} />
        </div>
        <Button type="button" size="icon" variant="ghost" className="mt-5 text-[#d0705c]" aria-label={`Видалити вміння ${ability.name}`} onClick={actions.onRemove}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-xs text-[#b8ab95]">{describeAbility(ability)}</p>
      <div className="space-y-1">
        <Label htmlFor={`${path}.description`} className="text-xs text-muted-foreground">
          Опис (необов&apos;язково)
        </Label>
        <Textarea
          id={`${path}.description`}
          rows={2}
          value={ability.description ?? ""}
          onChange={(e) => {
            const { description: _d, ...rest } = ability;

            actions.onChange(e.target.value ? { ...rest, description: e.target.value } : rest);
          }}
        />
      </div>
      <TriggerSection {...section} />
      <ConditionSection {...section} />
      <LimitsSection {...section} />
      <EffectsSection {...section} />
    </div>
  );
}
