"use client";

import { useProfile } from "../ProfileContext";

import { Button } from "@/components/ui/button";
import { useSpendHitDie } from "@/lib/hooks/characters";
import { useNotify } from "@/lib/hooks/common";

export function HitDicePanel() {
  const { campaignId, characterId, sheet } = useProfile();

  const spend = useSpendHitDie(campaignId, characterId);

  const notify = useNotify();

  const rest = sheet.rest;

  if (!rest?.persist || rest.hitDice.length === 0) return null;

  const canSpend = rest.shortRestOpen && !rest.dead && (sheet.viewer.isOwner || sheet.viewer.isDM);

  const onSpend = (classId: string) =>
    spend.mutateAsync(classId).then(
      (r) => notify(`Кістка хітів: ${r.roll} → +${r.healed} HP`),
      (e: Error) => notify(e.message || "Не вдалося витратити кістку хітів"),
    );

  return (
    <ul aria-label="Кістки хітів" className="mt-2 space-y-1 text-sm">
      {rest.hitDice.map((d) => (
        <li key={d.classId} className="flex min-h-9 items-center justify-between gap-2">
          <span className="text-hud-muted">
            {d.name} · d{d.die}: витрачено {d.spent} / {d.total}
          </span>
          {canSpend && d.spent < d.total && (
            <Button type="button" size="sm" variant="outline" disabled={spend.isPending} onClick={() => void onSpend(d.classId)}>
              Витратити
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
