"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import type { FieldProps } from "./FieldRenderer";
import { ScaleColumnSelect } from "./ScaleColumnSelect";

import { useAbilityEditor } from "@/components/abilities/editor-context";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { FORMULA_VARIABLES } from "@/lib/utils/abilities/engine/core/amount";
import type { Flat } from "@/lib/utils/abilities/schema";

type Mode = "number" | "formula" | "scale";

const modeOf = (v: Flat | undefined): Mode => (typeof v === "object" && v !== null ? ("formula" in v ? "formula" : "scale") : "number");

export function FlatField({ id, value, onChange }: FieldProps<Flat | undefined>) {
  const t = useTranslations("abilities.fields");

  const columns = useAbilityEditor().classColumns;

  const mode = modeOf(value);

  const [draft, setDraft] = useState<string | null>(null);

  const modes = [
    { value: "number", label: t("modes.number") },
    { value: "formula", label: t("modes.formula") },
    ...(columns ? [{ value: "scale", label: t("modes.scale") }] : []),
  ];

  const text = draft ?? (value === undefined ? "" : typeof value === "object" ? ("formula" in value ? value.formula : value.scale) : String(value));

  const emit = (m: Mode, t: string) => {
    if (m === "scale") return onChange({ scale: columns?.[0]?.key ?? "" });

    if (t.trim() === "") return onChange(undefined);

    if (m === "formula") return onChange({ formula: t });

    const n = Number(t);

    // keep partial input like "-" on screen; emit only once it is a real number
    if (Number.isFinite(n)) onChange(n);
  };

  if (mode === "scale" && !columns) {
    return (
      <p className="text-xs text-muted-foreground">
        <span>{t("classRefOutside")}</span> <code>[{text}]</code>
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        <div className={columns ? "w-32 shrink-0" : "w-24 shrink-0"}>
          <SelectField value={mode} options={modes} onValueChange={(m) => {
              setDraft(null);
              emit(m as Mode, text);
            }} />
        </div>
        {mode === "scale" ? (
          <ScaleColumnSelect id={id} value={text} onChange={(key) => onChange({ scale: key })} />
        ) : (
          <Input
            id={id}
            value={text}
            onChange={(e) => {
              setDraft(e.target.value);
              emit(mode, e.target.value);
            }}
            onBlur={() => setDraft(null)}
          />
        )}
      </div>
      {mode === "formula" && <p className="text-xs text-muted-foreground">{t("variables", { list: FORMULA_VARIABLES.join(", ") })}</p>}
    </div>
  );
}
