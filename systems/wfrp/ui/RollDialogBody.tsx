"use client";

import { useTranslations } from "next-intl";

import type { RollDialogBodyProps } from "@/components/systems/types";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { DIFFICULTY_KEYS } from "@/lib/utils/rules/systems";

export function RollDialogBody({ result, difficulty, setDifficulty }: RollDialogBodyProps) {
  const t = useTranslations("rest.sheetRoll");

  const tg = useTranslations("gameTerms");

  return (
    <>
      <div className="space-y-1">
        <Label htmlFor="sheet-roll-difficulty">{t("difficulty")}</Label>
        <SelectField id="sheet-roll-difficulty" value={difficulty} onValueChange={(v) => setDifficulty(v as typeof difficulty)} options={DIFFICULTY_KEYS.map((key) => ({ value: key, label: tg(`difficulty.${key}`) }))} triggerClassName="w-full" />
      </div>
      {result?.kind === "percentile" && (
        <div aria-live="polite" className="text-center">
          <div className="text-4xl font-bold tabular-nums text-hud-gold-bright">{result.roll}</div>
          <div className="text-xs text-hud-muted">
            {t("target", { target: result.target })}
            {result.reversed && <span title={t("reversed")}> ↔</span>}
            {result.auto && <span> · {t(`auto.${result.auto}`)}</span>}
          </div>
          <div className="mt-1 text-sm">
            {tg(`testOutcome.${result.outcome}`)} · {t("sl", { sl: result.sl })}
          </div>
          <div className="text-xs text-hud-muted">{tg(`difficulty.${result.difficulty}`)}</div>
        </div>
      )}
    </>
  );
}
