"use client";

import type { FieldProps } from "./FieldRenderer";

import { Input } from "@/components/ui/input";

export function NumberField({ id, value, onChange }: FieldProps<number | undefined>) {
  return (
    <Input
      id={id}
      type="number"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
    />
  );
}
