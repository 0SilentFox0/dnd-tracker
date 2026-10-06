"use client";

import { useState } from "react";

import type { FieldProps } from "./FieldRenderer";

import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import type { Amount } from "@/lib/utils/abilities/schema";
import { DICE_RE } from "@/lib/utils/abilities/schema/kinds";

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

/** `null` means "not a number yet" (e.g. a lone "-") — keep the previous value. */
function build(mode: Mode, text: string): Amount | undefined | null {
  if (text.trim() === "") return undefined;

  switch (mode) {
    case "number":
      return Number.isFinite(Number(text)) ? Number(text) : null;
    case "dice":
      return DICE_RE.test(text.trim()) ? text.trim() : text;
    case "formula":
      return { formula: text };
    default:
      return Number.isFinite(Number(text)) ? { percentOf: mode, value: Number(text) } : null;
  }
}

export function AmountField({ id, value, onChange }: FieldProps<Amount | undefined>) {
  const mode = modeOf(value);

  const [draft, setDraft] = useState<string | null>(null);

  const emit = (next: Amount | undefined | null) => {
    if (next !== null) onChange(next);
  };

  return (
    <div className="flex gap-1">
      <div className="w-28 shrink-0">
        <SelectField value={mode} options={MODES} onValueChange={(m) => {
            setDraft(null);
            emit(build(m as Mode, textOf(value)));
          }} />
      </div>
      <Input
        id={id}
        value={draft ?? textOf(value)}
        onChange={(e) => {
          setDraft(e.target.value);
          emit(build(mode, e.target.value));
        }}
        onBlur={() => setDraft(null)}
      />
    </div>
  );
}
