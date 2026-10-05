"use client";

import type { FieldProps } from "./FieldRenderer";

import { Switch } from "@/components/ui/switch";

export function ToggleField({ id, value, onChange }: FieldProps<boolean | undefined>) {
  return <Switch id={id} checked={value === true} onCheckedChange={(c) => onChange(c ? true : undefined)} />;
}
