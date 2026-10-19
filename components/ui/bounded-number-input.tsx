"use client";

import { type ComponentProps, useState } from "react";

import { Input } from "@/components/ui/input";

type BoundedNumberInputProps = Omit<ComponentProps<typeof Input>, "type" | "value" | "defaultValue" | "onChange" | "onBlur" | "min" | "max"> & {
  value: number;
  min: number;
  max: number;
  onCommit: (value: number) => void;
};

/** Чернетка під час введення (можна стерти й набрати заново); обмеження й запис — на blur чи Enter, порожнє повертає останнє значення. */
export function BoundedNumberInput({ value, min, max, onCommit, onKeyDown, inputMode = "numeric", ...props }: BoundedNumberInputProps) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;

    setDraft(null);

    const n = Number(draft);

    if (draft.trim() === "" || !Number.isFinite(n)) return;

    const next = Math.max(min, Math.min(max, Math.trunc(n)));

    if (next !== value) onCommit(next);
  };

  return (
    <Input
      {...props}
      inputMode={inputMode}
      value={draft ?? String(value)}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        // Enter у формі бою інакше відправив би всю форму
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        }

        onKeyDown?.(e);
      }}
    />
  );
}
