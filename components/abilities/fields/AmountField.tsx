"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import type { FieldProps } from "./FieldRenderer";
import { ScaleColumnSelect } from "./ScaleColumnSelect";

import { useAbilityEditor } from "@/components/abilities/editor-context";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { FORMULA_VARIABLES } from "@/lib/utils/abilities/engine/core/amount";
import type { Amount } from "@/lib/utils/abilities/schema";
import { DICE_RE } from "@/lib/utils/abilities/schema/kinds";

type Mode = "number" | "dice" | "formula" | "scale" | "spellRoll" | "eventDamage" | "maxHp" | "ownerAttack";

const BASE_MODES = ["number", "dice", "formula", "spellRoll", "eventDamage", "maxHp", "ownerAttack"] as const satisfies readonly Mode[];

function modeOf(v: Amount | undefined): Mode {
  if (typeof v === "string") return "dice";

  if (v && typeof v === "object") return "formula" in v ? "formula" : "scale" in v ? "scale" : "spellRoll" in v ? "spellRoll" : v.percentOf;

  return "number";
}

const DICE_SIDES = [4, 6, 8, 10, 12, 20, 100] as const;

const DICE_COUNTS = Array.from({ length: 20 }, (_, i) => String(i + 1));

const DICE_COUNT_OPTIONS = DICE_COUNTS.map((n) => ({ value: n, label: n }));

const DICE_SIDE_OPTIONS = DICE_SIDES.map((n) => ({ value: String(n), label: `d${n}` }));

/** Plain `NdM` the two selects can express; anything else (modifier, odd die, count > 20) keeps the text input. */
export function parseSimpleDice(v: string): { count: string; sides: string } | null {
  const m = /^(\d+)d(\d+)$/.exec(v);

  if (!m || !DICE_COUNTS.includes(m[1]) || !DICE_SIDES.some((s) => String(s) === m[2])) return null;

  return { count: m[1], sides: m[2] };
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

  if (mode === "dice" && !DICE_RE.test(text.trim())) return "1d6";

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
  const t = useTranslations("abilities.fields");

  const columns = useAbilityEditor().classColumns;

  const mode = modeOf(value);

  const [draft, setDraft] = useState<string | null>(null);

  const dice = mode === "dice" && draft === null && typeof value === "string" ? parseSimpleDice(value) : null;

  const first = columns?.[0]?.key ?? "";

  const modes = (columns ? [...BASE_MODES.slice(0, 3), "scale" as const, ...BASE_MODES.slice(3)] : [...BASE_MODES]).map((value) => ({ value, label: t(`modes.${value}`) }));

  const emit = (next: Amount | undefined | null) => {
    if (next !== null) onChange(next);
  };

  if (mode === "scale" && !columns) {
    return (
      <p className="text-xs text-muted-foreground">
        <span>{t("classRefOutside")}</span> <code>[{textOf(value)}]</code>
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
        ) : dice ? (
          <>
            <div className="w-16 shrink-0">
              <SelectField id={id} aria-label={t("diceCount")} value={dice.count} options={DICE_COUNT_OPTIONS} onValueChange={(n) => onChange(`${n}d${dice.sides}`)} />
            </div>
            <div className="w-20 shrink-0">
              <SelectField aria-label={t("diceSides")} value={dice.sides} options={DICE_SIDE_OPTIONS} onValueChange={(d) => onChange(`${dice.count}d${d}`)} />
            </div>
          </>
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
      {mode === "formula" && <p className="text-xs text-muted-foreground">{t("variables", { list: FORMULA_VARIABLES.join(", ") })}</p>}
    </div>
  );
}
