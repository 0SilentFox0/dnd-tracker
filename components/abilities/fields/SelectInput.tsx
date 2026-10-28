"use client";

import type { FieldProps } from "./FieldRenderer";

import { SelectField } from "@/components/ui/select-field";

export function SelectInput({ id, value, onChange, meta }: FieldProps<string | undefined>) {
  const options = [...(meta.options ?? [])];

  const groupNames = [...new Set(options.map((o) => o.group).filter((g): g is string => !!g))];

  return (
    <SelectField
      id={id}
      value={value ?? ""}
      options={options}
      groups={groupNames.length ? groupNames.map((label) => ({ label, options: options.filter((o) => o.group === label) })) : undefined}
      allowNone={meta.optional}
      noneLabel="—"
      onValueChange={(v) => onChange(v === "" ? undefined : v)}
    />
  );
}
