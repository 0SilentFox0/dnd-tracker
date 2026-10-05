"use client";

import { useState } from "react";

import type { FieldProps } from "./FieldRenderer";

import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import type { Flat } from "@/lib/utils/abilities/schema";

const MODES = [
  { value: "number", label: "число" },
  { value: "formula", label: "формула" },
];

export function FlatField({ id, value, onChange }: FieldProps<Flat | undefined>) {
  const formula = typeof value === "object" && value !== null;

  const [draft, setDraft] = useState<string | null>(null);

  const text = draft ?? (value === undefined ? "" : formula ? value.formula : String(value));

  const emit = (isFormula: boolean, t: string) => {
    if (t.trim() === "") return onChange(undefined);

    if (isFormula) return onChange({ formula: t });

    const n = Number(t);

    // keep partial input like "-" on screen; emit only once it is a real number
    if (Number.isFinite(n)) onChange(n);
  };

  return (
    <div className="flex gap-1">
      <div className="w-24 shrink-0">
        <SelectField value={formula ? "formula" : "number"} options={MODES} onValueChange={(m) => {
            setDraft(null);
            emit(m === "formula", text);
          }} />
      </div>
      <Input
        id={id}
        value={text}
        onChange={(e) => {
          setDraft(e.target.value);
          emit(formula, e.target.value);
        }}
        onBlur={() => setDraft(null)}
      />
    </div>
  );
}
