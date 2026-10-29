"use client";

import { useTranslations } from "next-intl";

import { useProfile } from "../ProfileContext";

import { Button } from "@/components/ui/button";
import { useSpendHitDie } from "@/lib/hooks/characters";
import { useNotify } from "@/lib/hooks/common";

export function HitDicePanel() {
  const t = useTranslations("rest.hitDice");

  const { campaignId, characterId, sheet } = useProfile();

  const spend = useSpendHitDie(campaignId, characterId);

  const te = useTranslations("rest.errors");

  const notify = useNotify();

  const rest = sheet.rest;

  if (!rest?.persist || rest.hitDice.length === 0) return null;

  const canSpend = rest.shortRestOpen && !rest.dead && (sheet.viewer.isOwner || sheet.viewer.isDM);

  const onSpend = (classId: string) =>
    spend.mutateAsync(classId).then(
      (r) => notify(t("rolled", { roll: r.roll, healed: r.healed })),
      (e: Error) => notify(e.message || te("hitDieFailed")),
    );

  return (
    <ul aria-label={t("aria")} className="mt-2 space-y-1 text-sm">
      {rest.hitDice.map((d) => (
        <li key={d.classId} className="flex min-h-9 items-center justify-between gap-2">
          <span className="text-hud-muted">
            {t("spent", { name: d.name, die: d.die, spent: d.spent, total: d.total })}
          </span>
          {canSpend && d.spent < d.total && (
            <Button type="button" size="sm" variant="outline" disabled={spend.isPending} onClick={() => void onSpend(d.classId)}>
              {t("spend")}
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
