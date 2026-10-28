"use client";

import type { FieldProps } from "./FieldRenderer";

import { SelectField } from "@/components/ui/select-field";
import { ABILITY_OPTIONS } from "@/lib/constants/abilities";

export function SaveEndsField({ id, value, onChange }: FieldProps<{ ability: string } | undefined>) {
  return (
    <SelectField
      id={id}
      value={value?.ability ?? ""}
      options={ABILITY_OPTIONS}
      allowNone
      noneLabel="—"
      onValueChange={(v) => onChange(v === "" ? undefined : { ability: v })}
    />
  );
}
