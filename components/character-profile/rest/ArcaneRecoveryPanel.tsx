"use client";

import { useTranslations } from "next-intl";

import { useProfile } from "../ProfileContext";

import { Button } from "@/components/ui/button";
import { useArcaneRecovery } from "@/lib/hooks/characters";
import type { SheetRest } from "@/types/characters";

function Picker({ offer }: { offer: NonNullable<SheetRest["arcaneRecovery"]> }) {
  const { campaignId, characterId } = useProfile();

  const t = useTranslations("rest.arcane");

  const { picks, total, canStep, step, canSubmit, submit } = useArcaneRecovery(campaignId, characterId, offer);

  return (
    <div aria-label={t("aria")} className="mt-2 space-y-1 text-sm">
      <p className="text-hud-muted">
        {t("budget", { total, budget: offer.budget })}
      </p>
      {offer.slots.length === 0 && <p className="text-hud-muted">{t("noSlots", { level: offer.maxSlotLevel })}</p>}
      {offer.slots.map(({ level, spent }) => (
        <div key={level} className="flex min-h-9 items-center justify-between gap-2">
          <span className="text-hud-muted">
            {t("slot", { level, spent })}
          </span>
          <span className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" aria-label={t("less", { level })} disabled={!canStep(level, -1)} onClick={() => step(level, -1)}>
              −
            </Button>
            <span aria-live="polite">{picks[level] ?? 0}</span>
            <Button type="button" size="sm" variant="outline" aria-label={t("more", { level })} disabled={!canStep(level, 1)} onClick={() => step(level, 1)}>
              +
            </Button>
          </span>
        </div>
      ))}
      <Button type="button" size="sm" disabled={!canSubmit} onClick={() => void submit()}>
        {t("restore")}
      </Button>
    </div>
  );
}

export function ArcaneRecoveryPanel() {
  const t = useTranslations("rest.arcane");

  const { sheet } = useProfile();

  const rest = sheet.rest;

  const offer = rest?.arcaneRecovery;

  if (!rest?.persist || !offer || !rest.shortRestOpen || rest.dead || !(sheet.viewer.isOwner || sheet.viewer.isDM)) return null;

  if (offer.used) return <p className="mt-2 text-sm text-hud-muted">{t("used")}</p>;

  return <Picker offer={offer} />;
}
