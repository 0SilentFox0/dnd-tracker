"use client";

import { useTranslations } from "next-intl";

import type { FieldProps } from "./FieldRenderer";

import { useAbilityEditor } from "@/components/abilities/editor-context";
import { SelectField } from "@/components/ui/select-field";
import { useUnits } from "@/lib/hooks/units";

export function UnitPickerField({ id, value, onChange, meta }: FieldProps<string | undefined>) {
  const t = useTranslations("abilities.fields");

  const { campaignId } = useAbilityEditor();

  const { data: units = [], isLoading } = useUnits(campaignId);

  return (
    <SelectField
      id={id}
      value={value ?? ""}
      options={units.map((u) => ({ value: u.id, label: u.name }))}
      placeholder={isLoading ? t("unitsLoading") : units.length === 0 ? t("unitsEmpty") : t("pickUnit")}
      allowNone={meta.optional}
      noneLabel="—"
      disabled={isLoading}
      onValueChange={(v) => onChange(v === "" ? undefined : v)}
    />
  );
}
