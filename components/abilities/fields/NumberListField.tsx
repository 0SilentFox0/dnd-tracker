"use client";

import type { FieldProps } from "./FieldRenderer";

import { Input } from "@/components/ui/input";

export function NumberListField({ id, value, onChange }: FieldProps<number[] | undefined>) {
  return (
    <Input
      id={id}
      inputMode="numeric"
      placeholder="1, 2"
      value={(value ?? []).join(", ")}
      onChange={(e) => {
        const nums = e.target.value.split(",").map((x) => Number(x.trim())).filter((n) => Number.isFinite(n) && n > 0);

        onChange(nums.length ? nums : undefined);
      }}
    />
  );
}
