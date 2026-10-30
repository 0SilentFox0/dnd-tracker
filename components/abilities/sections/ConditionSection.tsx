"use client";

import { useTranslations } from "next-intl";

import type { AbilitySectionProps } from "../AbilityPanel";
import { ConditionEditor, DEFAULT_CONDITION } from "../ConditionEditor";
import { SectionShell } from "./SectionShell";

import { Button } from "@/components/ui/button";

export function ConditionSection({ ability, path, onChange, state }: AbilitySectionProps) {
  const t = useTranslations("abilities.condition");

  const { condition, ...rest } = ability;

  const add = () => {
    onChange({ ...ability, condition: DEFAULT_CONDITION });

    if (!state.open) state.onToggle();
  };

  return (
    <SectionShell path={path} part="if" title={t("title")} {...state} onAdd={condition ? undefined : add} addLabel={t("add")}>
      {condition ? (
        <ConditionEditor condition={condition} path={`${path}.condition`} actions={{ onChange: (c) => onChange({ ...ability, condition: c }), onRemove: () => onChange(rest) }} />
      ) : (
        <Button type="button" size="sm" variant="outline" onClick={add}>
          {t("add")}
        </Button>
      )}
    </SectionShell>
  );
}
