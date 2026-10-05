"use client";

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

  const text = value === undefined ? "" : formula ? value.formula : String(value);

  const emit = (isFormula: boolean, t: string) => onChange(t.trim() === "" ? undefined : isFormula ? { formula: t } : Number(t));

  return (
    <div className="flex gap-1">
      <div className="w-24 shrink-0">
        <SelectField value={formula ? "formula" : "number"} options={MODES} onValueChange={(m) => emit(m === "formula", text)} />
      </div>
      <Input id={id} value={text} onChange={(e) => emit(formula, e.target.value)} />
    </div>
  );
}
