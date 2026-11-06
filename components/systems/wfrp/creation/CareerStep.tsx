"use client";

import { useTranslations } from "next-intl";

import { ModeTabs, OptionCard } from "./OptionCard";
import type { WfrpDraftFormState } from "./types";

import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";

export function CareerStep({ form }: { form: WfrpDraftFormState }) {
  const t = useTranslations("wfrpCreation.career");

  const { mode, setMode, rolls, roll, careerId, pick, table, all } = form.career;

  const xp = form.xp?.careerBonus;

  const modes = (["rolled", "choice", "free"] as const).map((m) => ({ value: m, label: `${t(`modes.${m}`)}${xp ? ` (${t("bonus", { xp: xp[m] })})` : ""}` }));

  return (
    <div className="space-y-3">
      <p className="text-sm text-hud-muted">{t("hint")}</p>
      <ModeTabs label={t("modeLabel")} value={mode} options={modes} onChange={setMode} />
      {mode === "rolled" && (
        <div className="space-y-2">
          <Button type="button" className="min-h-11 w-full sm:w-auto" onClick={roll}>
            {rolls.length ? t("reroll") : t("roll")}
          </Button>
          {rolls.length === 0 && <p className="text-sm text-hud-muted">{t("rollFirst")}</p>}
          <div role="radiogroup" aria-label={t("pickLabel")} className="grid gap-2">
            {rolls.map((r, i) => (
              <OptionCard key={`${r.careerId}-${i}`} selected={careerId === r.careerId} onSelect={() => pick(r.careerId)}>
                <b>{form.shown(`career${i}`, form.careerName(r.careerId))}</b>
                <span className="ml-2 text-hud-muted">{t("rolledAt", { roll: r.roll })}</span>
              </OptionCard>
            ))}
          </div>
        </div>
      )}
      {mode === "choice" &&
        (table.length ? (
          <div role="radiogroup" aria-label={t("pickLabel")} className="grid gap-2">
            {table.map((row) => (
              <OptionCard key={row.careerId} selected={careerId === row.careerId} onSelect={() => pick(row.careerId)}>
                {form.careerName(row.careerId)}
              </OptionCard>
            ))}
          </div>
        ) : (
          <p className="text-sm text-hud-muted">{t("emptyTable")}</p>
        ))}
      {mode === "free" && <SelectField aria-label={t("pickLabel")} value={careerId ?? ""} onValueChange={pick} placeholder={t("pickPlaceholder")} options={all.map((c) => ({ value: c.id, label: c.name }))} triggerClassName="min-h-11 w-full" />}
    </div>
  );
}
