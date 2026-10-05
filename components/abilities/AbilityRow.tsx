"use client";

import { X } from "lucide-react";

import { ConditionSection } from "./sections/ConditionSection";
import { EffectsSection } from "./sections/EffectsSection";
import { LimitsSection } from "./sections/LimitsSection";
import { TriggerSection } from "./sections/TriggerSection";
import { useErrorsUnder } from "./editor-context";
import { FieldErrors } from "./FieldErrors";

import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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

export function AbilityRow({ ability, path, actions }: { ability: Ability; path: string; actions: { onChange: (a: Ability) => void; onRemove: () => void } }) {
  const section = { ability, path, onChange: actions.onChange };

  const nameErrors = useErrorsUnder(`${path}.name`);

  return (
    <AccordionItem value={ability.id} className="rounded-md border px-2">
      <div className="flex items-center gap-1">
        <AccordionTrigger className="flex-1 py-2 text-left hover:no-underline">
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-medium">{ability.name}</span>
            <span className="truncate text-xs font-normal text-muted-foreground">{describeAbility(ability)}</span>
          </span>
        </AccordionTrigger>
        <Button type="button" size="icon" variant="ghost" aria-label={`Видалити вміння ${ability.name}`} onClick={actions.onRemove}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <AccordionContent className="space-y-3 pb-3">
        <div className="space-y-1">
          <Label htmlFor={`${path}.name`} className="text-xs text-muted-foreground">
            Назва
          </Label>
          <Input id={`${path}.name`} value={ability.name} onChange={(e) => actions.onChange({ ...ability, name: e.target.value })} />
          <FieldErrors errors={nameErrors} testId={`field-errors-${path}.name`} />
        </div>
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

              void _d;
              actions.onChange(e.target.value ? { ...rest, description: e.target.value } : rest);
            }}
          />
        </div>
        <TriggerSection {...section} />
        <ConditionSection {...section} />
        <LimitsSection {...section} />
        <EffectsSection {...section} />
      </AccordionContent>
    </AccordionItem>
  );
}
