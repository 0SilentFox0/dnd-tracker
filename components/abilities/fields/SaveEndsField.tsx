"use client";

import { useTranslations } from "next-intl";

import type { FieldProps } from "./FieldRenderer";

import { SelectField } from "@/components/ui/select-field";
import { ABILITY_KEYS } from "@/lib/constants/abilities";

export function SaveEndsField({ id, value, onChange }: FieldProps<{ ability: string } | undefined>) {
  const tg = useTranslations("gameTerms.abilities");

  return (
    <SelectField
      id={id}
      value={value?.ability ?? ""}
      options={ABILITY_KEYS.map((key) => ({ value: key, label: tg(`${key}.label`) }))}
      allowNone
      noneLabel="—"
      onValueChange={(v) => onChange(v === "" ? undefined : { ability: v })}
    />
  );
}
