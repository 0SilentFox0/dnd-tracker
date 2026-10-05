"use client";

import type { FieldProps } from "./FieldRenderer";

import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { type Amount, DICE_RE } from "@/lib/utils/abilities/schema";

type Mode = "number" | "dice" | "formula" | "eventDamage" | "maxHp";

const MODES = [
  { value: "number", label: "число" },
  { value: "dice", label: "кубики" },
  { value: "formula", label: "формула" },
  { value: "eventDamage", label: "% від шкоди" },
  { value: "maxHp", label: "% від макс. HP" },
];

function modeOf(v: Amount | undefined): Mode {
  if (typeof v === "string") return "dice";

  if (v && typeof v === "object") return "formula" in v ? "formula" : v.percentOf;

  return "number";
}

function textOf(v: Amount | undefined): string {
  if (v === undefined) return "";

  if (typeof v === "number" || typeof v === "string") return String(v);

  return "formula" in v ? v.formula : String(v.value);
}

function build(mode: Mode, text: string): Amount | undefined {
  if (text.trim() === "") return undefined;

  switch (mode) {
    case "number":
      return Number(text);
    case "dice":
      return DICE_RE.test(text.trim()) ? text.trim() : text;
    case "formula":
      return { formula: text };
    default:
      return { percentOf: mode, value: Number(text) };
  }
}

export function AmountField({ id, value, onChange }: FieldProps<Amount | undefined>) {
  const mode = modeOf(value);

  return (
    <div className="flex gap-1">
      <div className="w-28 shrink-0">
        <SelectField value={mode} options={MODES} onValueChange={(m) => onChange(build(m as Mode, textOf(value)))} />
      </div>
      <Input id={id} value={textOf(value)} onChange={(e) => onChange(build(mode, e.target.value))} />
    </div>
  );
}
