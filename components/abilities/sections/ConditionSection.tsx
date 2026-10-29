"use client";

import { useTranslations } from "next-intl";

import type { AbilitySectionProps } from "../AbilityPanel";
import { ConditionEditor, DEFAULT_CONDITION } from "../ConditionEditor";
import { SectionShell } from "./SectionShell";
import { SectionTitle } from "./SectionTitle";

import { Button } from "@/components/ui/button";

export function ConditionSection({ ability, path, onChange }: AbilitySectionProps) {
  const t = useTranslations("abilities.condition");

  const { condition, ...rest } = ability;

  return (
    <SectionShell path={path} part="if">
      <SectionTitle>{t("title")}</SectionTitle>
      {condition ? (
        <ConditionEditor condition={condition} path={`${path}.condition`} actions={{ onChange: (c) => onChange({ ...ability, condition: c }), onRemove: () => onChange(rest) }} />
      ) : (
        <Button type="button" size="sm" variant="outline" onClick={() => onChange({ ...ability, condition: DEFAULT_CONDITION })}>
          {t("add")}
        </Button>
      )}
    </SectionShell>
  );
}
