"use client";

import type { FieldProps } from "./FieldRenderer";

import { Button } from "@/components/ui/button";

export function MultiSelectField({ id, value, onChange, meta }: FieldProps<string[] | "all" | undefined>) {
  const selected = value === "all" ? ["all"] : (value ?? []);

  const toggle = (v: string) => {
    if (v === "all") return onChange(selected.includes("all") ? undefined : "all");

    const base = selected.filter((x) => x !== "all");

    const next = base.includes(v) ? base.filter((x) => x !== v) : [...base, v];

    onChange(next.length ? next : undefined);
  };

  return (
    <div id={id} className="flex flex-wrap gap-1">
      {(meta.options ?? []).map((o) => (
        <Button
          key={o.value}
          type="button"
          size="sm"
          variant={selected.includes(o.value) ? "secondary" : "outline"}
          aria-pressed={selected.includes(o.value)}
          onClick={() => toggle(o.value)}
        >
          {o.label}
        </Button>
      ))}
    </div>
  );
}
