"use client";

import { useTranslations } from "next-intl";

import { ModeTabs, OptionCard } from "./OptionCard";
import type { WfrpDraftFormState } from "./types";

import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";

export function CareerStep({ form }: { form: WfrpDraftFormState }) {
  const t = useTranslations("wfrpCreation.career");

  const { mode, setMode, rolls, roll, careerId, pick, all } = form.career;

  const xp = form.xp?.careerBonus;

  const modes = (["rolled", "choice", "free"] as const).map((m) => ({ value: m, label: `${t(`modes.${m}`)}${xp ? ` (${t("bonus", { xp: xp[m] })})` : ""}` }));

  return (
    <div className="space-y-3">
      <p className="text-sm text-hud-muted">{t("hint")}</p>
      <ModeTabs label={t("modeLabel")} value={mode} options={modes} onChange={setMode} />
      {mode !== "free" && (
        <div className="space-y-2">
          {rolls.length === 0 && (
            <>
              <Button type="button" className="min-h-11 w-full sm:w-auto" onClick={roll}>
                {t("roll")}
              </Button>
              <p className="text-sm text-hud-muted">{t(mode === "rolled" ? "rollFirstRolled" : "rollFirst")}</p>
            </>
          )}
          <div role="radiogroup" aria-label={t("pickLabel")} className="grid gap-2">
            {(mode === "rolled" ? rolls.slice(0, 1) : rolls.filter((r, i) => rolls.findIndex((x) => x.careerId === r.careerId) === i)).map((r, i) => (
              <OptionCard key={`${r.careerId}-${i}`} selected={careerId === r.careerId} onSelect={() => pick(r.careerId)}>
                <b>{form.shown(`career${i}`, form.careerName(r.careerId))}</b>
                <span className="ml-2 text-hud-muted">{t("rolledAt", { roll: r.roll })}</span>
              </OptionCard>
            ))}
          </div>
          {mode === "rolled" && rolls.length > 0 && <p className="text-sm text-hud-muted">{t("rolledFinal")}</p>}
        </div>
      )}
      {mode === "free" && <SelectField aria-label={t("pickLabel")} value={careerId ?? ""} onValueChange={pick} placeholder={t("pickPlaceholder")} options={all.map((c) => ({ value: c.id, label: c.name }))} triggerClassName="min-h-11 w-full" />}
    </div>
  );
}
