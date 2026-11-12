"use client";

import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp } from "lucide-react";

import { ModeTabs } from "./OptionCard";
import type { WfrpDraftFormState } from "./types";

import { BoundedNumberInput } from "@/components/ui/bounded-number-input";
import { Button } from "@/components/ui/button";
import { FREE_POINT_MAX, FREE_POINT_MIN } from "@/systems/wfrp/rules/advancement/rules";
import { CHARACTERISTIC_KEYS } from "@/systems/wfrp/rules/characteristics/keys";
import { STAT_FLOOR } from "@/systems/wfrp/rules/creation";

export function StatsStep({ form }: { form: WfrpDraftFormState }) {
  const t = useTranslations("wfrpCreation.stats");

  const tg = useTranslations("gameTerms.characteristics");

  const { mode, setMode, rolls, roll, arranged, swap, points, setPoint, budget } = form.stats;

  const xp = form.xp?.statBonus;

  const modes = (["rolled", "rearranged", "free"] as const).map((m) => ({ value: m, label: `${t(`modes.${m}`)}${xp ? ` (${t("bonus", { xp: xp[m] })})` : ""}` }));

  const spent = points.reduce((a, b) => a + b, 0);

  const values = mode === "free" ? points : mode === "rearranged" ? arranged : rolls;

  const total = (i: number) => STAT_FLOOR + (form.profile?.mods[CHARACTERISTIC_KEYS[i]] ?? 0) + values[i];

  return (
    <div className="space-y-3">
      <p className="text-sm text-hud-muted">{t("hint")}</p>
      <ModeTabs label={t("modeLabel")} value={mode} options={modes} onChange={setMode} />
      {mode !== "free" && (
        <>
          {rolls.length === 0 && (
            <>
              <Button type="button" className="min-h-11 w-full sm:w-auto" onClick={roll}>
                {t("roll")}
              </Button>
              <p className="text-sm text-hud-muted">{t("rollFirst")}</p>
            </>
          )}
          {mode === "rearranged" && rolls.length > 0 && <p className="text-sm text-hud-muted">{t("swapHint")}</p>}
        </>
      )}
      {mode === "free" && (
        <p role="status" className="text-sm text-hud-muted">
          {t("budget", { spent, budget })}
        </p>
      )}
      {values.length === CHARACTERISTIC_KEYS.length && (
        <ul className="grid gap-2">
          {CHARACTERISTIC_KEYS.map((key, i) => (
            <li key={key} className="flex min-h-11 items-center gap-2 rounded-lg border border-hud-line px-3 py-1">
              <span className="min-w-0 flex-1 text-sm">{tg(`${key}.label`)}</span>
              {mode === "free" ? (
                <BoundedNumberInput aria-label={t("value", { characteristic: tg(`${key}.label`) })} className="min-h-11 w-16 text-center" value={points[i]} min={FREE_POINT_MIN} max={FREE_POINT_MAX} onCommit={(v) => setPoint(i, v)} onValueChange={(v) => setPoint(i, v)} />
              ) : (
                <b data-testid={`stat-${key}`} className="w-8 text-center tabular-nums">
                  {form.shown(`stat${i}`, values[i])}
                </b>
              )}
              <span className="w-16 text-right text-sm tabular-nums text-hud-muted">{t("total", { total: total(i) })}</span>
              {mode === "rearranged" && (
                <>
                  <Button type="button" size="icon" variant="outline" className="size-11" aria-label={`${t("up")}: ${tg(`${key}.label`)}`} disabled={i === 0} onClick={() => swap(i, i - 1)}>
                    <ArrowUp aria-hidden />
                  </Button>
                  <Button type="button" size="icon" variant="outline" className="size-11" aria-label={`${t("down")}: ${tg(`${key}.label`)}`} disabled={i === CHARACTERISTIC_KEYS.length - 1} onClick={() => swap(i, i + 1)}>
                    <ArrowDown aria-hidden />
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
