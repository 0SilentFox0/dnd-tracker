"use client";

import type { FieldProps } from "./FieldRenderer";

import { Input } from "@/components/ui/input";
import type { Duration } from "@/lib/utils/abilities/schema";

export function DurationField({ id, value, onChange }: FieldProps<Duration | undefined>) {
  return (
    <Input
      id={id}
      type="number"
      min={1}
      value={value?.rounds ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? undefined : { rounds: Number(e.target.value) })}
    />
  );
}
