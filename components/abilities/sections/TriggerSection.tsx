"use client";

import { useTranslations } from "next-intl";

import type { AbilitySectionProps } from "../AbilityPanel";
import { useFieldErrors } from "../editor-context";
import { FieldErrors } from "../FieldErrors";
import { FieldRenderer } from "../fields/FieldRenderer";
import { SectionTitle } from "./SectionTitle";

import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { useTranslator } from "@/lib/i18n/use-translator";
import { changeTriggerEvent, getAtPath, setAtPath } from "@/lib/utils/abilities/editor";
import { TRIGGER_REGISTRY } from "@/lib/utils/abilities/registry/triggers";
import type { Trigger, TriggerEvent } from "@/lib/utils/abilities/schema";

export function TriggerSection({ ability, path, onChange }: AbilitySectionProps) {
  const t = useTranslations("abilities.trigger");

  const tr = useTranslator("abilityRegistry");

  const eventOptions = Object.keys(TRIGGER_REGISTRY).map((value) => ({ value, label: tr(`triggers.${value}.label`) }));

  const fields = TRIGGER_REGISTRY[ability.trigger.event].fields;

  const errors = useFieldErrors(`${path}.trigger`);

  return (
    <div className="space-y-2">
      <SectionTitle>{t("title")}</SectionTitle>
      <div className="space-y-1">
        <Label htmlFor={`${path}.trigger.event`} className="text-xs text-muted-foreground">
          {t("event")}
        </Label>
        <SelectField
          id={`${path}.trigger.event`}
          value={ability.trigger.event}
          options={eventOptions}
          onValueChange={(event) => onChange(changeTriggerEvent(ability, event as TriggerEvent))}
        />
      </div>
      {ability.trigger.event === "roundStart" && <p className="text-xs text-muted-foreground">{t("roundStartHint")}</p>}
      <div className="grid grid-cols-6 items-end gap-2 [&>*]:min-w-0">
        {fields.map((f) => (
          <FieldRenderer
            key={f.name}
            meta={f}
            owner={`triggers.${ability.trigger.event}`}
            path={`${path}.trigger.${f.name}`}
            value={getAtPath(ability.trigger, f.name)}
            onChange={(v) => onChange({ ...ability, trigger: setAtPath(ability.trigger, f.name, v) as Trigger })}
          />
        ))}
      </div>
      <FieldErrors errors={errors} />
    </div>
  );
}
