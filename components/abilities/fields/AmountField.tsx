"use client";

import { useState } from "react";

import type { FieldProps } from "./FieldRenderer";
import { ScaleColumnSelect } from "./ScaleColumnSelect";

import { useAbilityEditor } from "@/components/abilities/editor-context";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { CLASS_REF_OUTSIDE } from "@/lib/utils/abilities/class-columns";
import { FORMULA_VARIABLES } from "@/lib/utils/abilities/engine/core/amount";
import type { Amount } from "@/lib/utils/abilities/schema";
import { DICE_RE } from "@/lib/utils/abilities/schema/kinds";

type Mode = "number" | "dice" | "formula" | "scale" | "spellRoll" | "eventDamage" | "maxHp" | "ownerAttack";

const BASE_MODES = [
  { value: "number", label: "число" },
  { value: "dice", label: "кубики" },
  { value: "formula", label: "формула" },
  { value: "spellRoll", label: "% кидка заклинання" },
  { value: "eventDamage", label: "% від шкоди" },
  { value: "maxHp", label: "% від макс. HP" },
  { value: "ownerAttack", label: "% шкоди моєї атаки" },
];

function modeOf(v: Amount | undefined): Mode {
  if (typeof v === "string") return "dice";

  if (v && typeof v === "object") return "formula" in v ? "formula" : "scale" in v ? "scale" : "spellRoll" in v ? "spellRoll" : v.percentOf;

  return "number";
}

function textOf(v: Amount | undefined): string {
  if (v === undefined) return "";

  if (typeof v === "number" || typeof v === "string") return String(v);

  if ("scale" in v) return v.scale;

  if ("formula" in v) return v.formula;

  if ("spellRoll" in v) return typeof v.spellRoll === "number" ? String(v.spellRoll) : v.spellRoll.formula;

  return String(v.value);
}

/** `null` means "not a number yet" (e.g. a lone "-") — keep the previous value. */
function build(mode: Mode, text: string, firstColumn: string): Amount | undefined | null {
  if (mode === "scale") return { scale: firstColumn };

  if (text.trim() === "") return undefined;

  switch (mode) {
    case "number":
      return Number.isFinite(Number(text)) ? Number(text) : null;
    case "dice":
      return DICE_RE.test(text.trim()) ? text.trim() : text;
    case "formula":
      return { formula: text };
    case "spellRoll":
      if (!Number.isFinite(Number(text))) return { spellRoll: { formula: text } };

      return Number(text) > 0 ? { spellRoll: Number(text) } : null;
    default:
      return Number.isFinite(Number(text)) ? { percentOf: mode, value: Number(text) } : null;
  }
}

export function AmountField({ id, value, onChange }: FieldProps<Amount | undefined>) {
  const columns = useAbilityEditor().classColumns;

  const mode = modeOf(value);

  const [draft, setDraft] = useState<string | null>(null);

  const first = columns?.[0]?.key ?? "";

  const modes = columns ? [...BASE_MODES.slice(0, 3), { value: "scale", label: "з таблиці класу" }, ...BASE_MODES.slice(3)] : BASE_MODES;

  const emit = (next: Amount | undefined | null) => {
    if (next !== null) onChange(next);
  };

  if (mode === "scale" && !columns) {
    return (
      <p className="text-xs text-muted-foreground">
        <span>{CLASS_REF_OUTSIDE}</span> <code>[{textOf(value)}]</code>
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        <div className={columns ? "w-32 shrink-0" : "w-28 shrink-0"}>
          <SelectField value={mode} options={modes} onValueChange={(m) => {
              setDraft(null);
              emit(build(m as Mode, textOf(value), first));
            }} />
        </div>
        {mode === "scale" ? (
          <ScaleColumnSelect id={id} value={textOf(value)} onChange={(key) => onChange({ scale: key })} />
        ) : (
          <Input
            id={id}
            value={draft ?? textOf(value)}
            onChange={(e) => {
              setDraft(e.target.value);
              emit(build(mode, e.target.value, first));
            }}
            onBlur={() => setDraft(null)}
          />
        )}
      </div>
      {mode === "formula" && <p className="text-xs text-muted-foreground">Змінні: {FORMULA_VARIABLES.join(", ")}</p>}
    </div>
  );
}
