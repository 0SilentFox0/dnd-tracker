"use client";

import { useTranslations } from "next-intl";

import type { Encumbrance } from "@/systems/wfrp/rules/equipment/encumbrance";

export function EncumbranceBar({ carried, limit, over }: Encumbrance) {
  const t = useTranslations("wfrpEquipment.encumbrance");

  const percent = limit > 0 ? Math.min(100, Math.round((carried / limit) * 100)) : carried > 0 ? 100 : 0;

  return (
    <div className="mt-2">
      <p className="text-sm text-hud-muted">{t("label", { carried, limit })}</p>
      <div role="progressbar" aria-valuemin={0} aria-valuemax={limit} aria-valuenow={carried} className="mt-1 h-1.5 overflow-hidden rounded bg-hud-field">
        <div className={`h-full ${over ? "bg-hud-danger" : "bg-hud-gold-strong"}`} style={{ width: `${percent}%` }} />
      </div>
      {over && <p className="mt-1 text-xs text-hud-danger">{t("over")}</p>}
    </div>
  );
}
