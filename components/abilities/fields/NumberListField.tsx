"use client";

import { useState } from "react";

import type { FieldProps } from "./FieldRenderer";

import { Input } from "@/components/ui/input";

export function NumberListField({ id, value, onChange }: FieldProps<number[] | undefined>) {
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <Input
      id={id}
      inputMode="numeric"
      placeholder="1, 2"
      value={draft ?? (value ?? []).join(", ")}
      onChange={(e) => {
        setDraft(e.target.value);

        const nums = e.target.value.split(",").map((x) => Number(x.trim())).filter((n) => Number.isFinite(n) && n > 0);

        onChange(nums.length ? nums : undefined);
      }}
      onBlur={() => setDraft(null)}
    />
  );
}
