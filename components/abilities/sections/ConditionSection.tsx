"use client";

import { useTranslations } from "next-intl";

import type { AbilitySectionProps } from "../AbilityPanel";
import { ConditionEditor, DEFAULT_CONDITION } from "../ConditionEditor";
import { SectionShell } from "./SectionShell";

export function ConditionSection({ ability, path, onChange, state }: AbilitySectionProps) {
  const t = useTranslations("abilities.condition");

  const { condition, ...rest } = ability;

  return (
    <SectionShell
      path={path}
      part="if"
      title={t("title")}
      {...state}
      onAdd={
        condition
          ? undefined
          : () => {
              onChange({ ...ability, condition: DEFAULT_CONDITION });

              if (!state.open) state.onToggle();
            }
      }
      addLabel={t("add")}
    >
      {condition && <ConditionEditor condition={condition} path={`${path}.condition`} actions={{ onChange: (c) => onChange({ ...ability, condition: c }), onRemove: () => onChange(rest) }} />}
    </SectionShell>
  );
}
