"use client";

import type { FieldProps } from "./FieldRenderer";

import { SelectField } from "@/components/ui/select-field";

export function SelectInput({ id, value, onChange, meta }: FieldProps<string | undefined>) {
  return (
    <SelectField
      id={id}
      value={value ?? ""}
      options={[...(meta.options ?? [])]}
      allowNone={meta.optional}
      noneLabel="—"
      onValueChange={(v) => onChange(v === "" ? undefined : v)}
    />
  );
}
