"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { PeriodSummaryView } from "./PeriodSummaryView";

import { CharacterPickList } from "@/components/characters/rest/CharacterPickList";
import type { DowntimePeriodPanelProps } from "@/components/systems/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useCheckedIds, useConfirm } from "@/lib/hooks/common";
import { useDowntimePeriod, useDowntimePeriodUndo } from "@/systems/wfrp/hooks";
import type { DowntimePeriodResult } from "@/systems/wfrp/rules/downtime/api-types";
import { MAX_DAYS } from "@/systems/wfrp/rules/downtime/constants";

const DEFAULT_DAYS = 7;

export function DowntimePeriodPanel({ campaignId, characters }: DowntimePeriodPanelProps) {
  const t = useTranslations("wfrpDowntime.panel");

  const period = useDowntimePeriod(campaignId);

  const undo = useDowntimePeriodUndo(campaignId);

  const confirm = useConfirm();

  const [open, setOpen] = useState(false);

  const [days, setDays] = useState(String(DEFAULT_DAYS));

  const [passed, setPassed] = useState(false);

  const result = passed ? (period.data ?? null) : null;

  const [undone, setUndone] = useState(false);

  const checked = useCheckedIds(characters);

  const maxDays = MAX_DAYS;

  const n = Number(days);

  const valid = days.trim() !== "" && Number.isInteger(n) && n >= 1 && n <= maxDays && checked.picked.size > 0;

  const close = (o: boolean) => {
    setOpen(o);

    if (!o) {
      setPassed(false);
      setUndone(false);
    }
  };

  const submit = () =>
    void period.mutateOk({ days: n, characterIds: [...checked.picked] }).then((ok) => {
      if (ok) {
        setPassed(true);
        setUndone(false);
      }
    });

  const revert = (r: DowntimePeriodResult) =>
    confirm({
      title: t("undo"),
      description: t("undoConfirm"),
      confirmLabel: t("undo"),
      onConfirm: async () => {
        const ok = await undo.mutateOk({ periodId: r.periodId, characterIds: r.characters.map((c) => c.id) });

        if (ok) setUndone(true);
      },
    });

  const names = new Map(characters.map((c) => [c.id, c.name]));

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        {t("button")}
      </Button>
      <ResponsiveDialog
        hud
        open={open}
        onOpenChange={close}
        title={t("title")}
        footer={
          result ? (
            <Button type="button" variant="outline" disabled={undone || undo.isPending} onClick={() => revert(result)}>
              {undone ? t("undone") : t("undo")}
            </Button>
          ) : (
            <Button type="button" disabled={!valid || period.isPending} onClick={submit}>
              {t("submit")}
            </Button>
          )
        }
      >
        {result ? (
          <div className="space-y-3">
            <h3 className="hud-sc text-sm text-hud-gold">{t("result")}</h3>
            {result.characters.map((c) => (
              <div key={c.id}>
                <p className="font-medium text-hud-ink">{names.get(c.id) ?? c.id}</p>
                {c.downtime.lastPeriod && <PeriodSummaryView summary={c.downtime.lastPeriod.summary} />}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block text-sm">
              {t("days")}
              <Input className="mt-1 min-h-11" type="number" min={1} max={maxDays} inputMode="numeric" aria-invalid={!valid && checked.picked.size > 0} value={days} onChange={(e) => setDays(e.target.value)} />
              <span className="text-xs text-hud-muted">{t("daysHint", { max: maxDays })}</span>
            </label>
            <h3 className="hud-sc text-sm text-hud-gold">{t("heroes")}</h3>
            <CharacterPickList characters={characters} checked={checked} />
          </div>
        )}
      </ResponsiveDialog>
    </>
  );
}
