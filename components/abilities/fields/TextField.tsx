"use client";

import type { FieldProps } from "./FieldRenderer";

import { Input } from "@/components/ui/input";

export function TextField({ id, value, onChange, meta }: FieldProps<string | string[] | undefined>) {
  const list = meta.input === "strings";

  const text = Array.isArray(value) ? value.join(", ") : (value ?? "");

  return (
    <Input
      id={id}
      value={text}
      onChange={(e) => {
        const raw = e.target.value;

        if (!list) return onChange(raw === "" ? undefined : raw);

        const items = raw.split(",").map((x) => x.trim()).filter(Boolean);

        onChange(items.length ? items : undefined);
      }}
    />
  );
}
