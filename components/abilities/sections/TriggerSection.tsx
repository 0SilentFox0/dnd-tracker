"use client";

import type { AbilitySectionProps } from "../AbilityPanel";
import { useFieldErrors } from "../editor-context";
import { FieldRenderer } from "../fields/FieldRenderer";
import { SectionTitle } from "./SectionTitle";

import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { changeTriggerEvent, getAtPath, setAtPath } from "@/lib/utils/abilities/editor";
import { TRIGGER_REGISTRY } from "@/lib/utils/abilities/registry/triggers";
import type { Trigger, TriggerEvent } from "@/lib/utils/abilities/schema";

const EVENT_OPTIONS = Object.values(TRIGGER_REGISTRY).map((d) => ({ value: d.event, label: d.label }));

export function TriggerSection({ ability, path, onChange }: AbilitySectionProps) {
  const fields = TRIGGER_REGISTRY[ability.trigger.event].fields;

  const errors = useFieldErrors(`${path}.trigger`);

  return (
    <div className="space-y-2">
      <SectionTitle>Коли</SectionTitle>
      <div className="space-y-1">
        <Label htmlFor={`${path}.trigger.event`} className="text-xs text-muted-foreground">
          Подія
        </Label>
        <SelectField
          id={`${path}.trigger.event`}
          value={ability.trigger.event}
          options={EVENT_OPTIONS}
          onValueChange={(event) => onChange(changeTriggerEvent(ability, event as TriggerEvent))}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {fields.map((f) => (
          <FieldRenderer
            key={f.name}
            meta={f}
            path={`${path}.trigger.${f.name}`}
            value={getAtPath(ability.trigger, f.name)}
            onChange={(v) => onChange({ ...ability, trigger: setAtPath(ability.trigger, f.name, v) as Trigger })}
          />
        ))}
      </div>
      {errors.map((e) => (
        <p key={e} className="text-xs text-destructive">
          {e}
        </p>
      ))}
    </div>
  );
}
