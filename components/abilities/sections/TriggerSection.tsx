"use client";

import { useTranslations } from "next-intl";

import type { AbilitySectionProps } from "../AbilityPanel";
import { useFieldErrors } from "../editor-context";
import { FieldErrors } from "../FieldErrors";
import { FieldRenderer } from "../fields/FieldRenderer";
import { SectionShell } from "./SectionShell";
import { SectionTitle } from "./SectionTitle";

import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { useTranslator } from "@/lib/i18n/use-translator";
import { changeTriggerEvent, getAtPath, setAtPath } from "@/lib/utils/abilities/editor";
import { TRIGGER_GROUPS, TRIGGER_REGISTRY, TRIGGERS_BY_GROUP } from "@/lib/utils/abilities/registry/triggers";
import type { Trigger, TriggerEvent } from "@/lib/utils/abilities/schema";

export function TriggerSection({ ability, path, onChange }: AbilitySectionProps) {
  const t = useTranslations("abilities.trigger");

  const tr = useTranslator("abilityRegistry");

  const groups = TRIGGER_GROUPS.map((group) => ({
    label: tr(`triggerGroups.${group}`),
    options: TRIGGERS_BY_GROUP[group].map((event) => ({ value: event, label: tr(`triggers.${event}.label`) })),
  })).filter((g) => g.options.length);

  const fields = TRIGGER_REGISTRY[ability.trigger.event].fields;

  const errors = useFieldErrors(`${path}.trigger`);

  return (
    <SectionShell path={path} part="when">
      <SectionTitle>{t("title")}</SectionTitle>
      <div className="space-y-1">
        <Label htmlFor={`${path}.trigger.event`} className="text-xs text-muted-foreground">
          {t("event")}
        </Label>
        <SelectField
          id={`${path}.trigger.event`}
          value={ability.trigger.event}
          groups={groups}
          onValueChange={(event) => onChange(changeTriggerEvent(ability, event as TriggerEvent))}
        />
      </div>
      <p className="text-xs text-muted-foreground">{tr(`triggers.${ability.trigger.event}.hint`)}</p>
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
    </SectionShell>
  );
}
