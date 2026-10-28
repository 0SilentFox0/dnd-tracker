"use client";

import { useProfile } from "../ProfileContext";

import { Button } from "@/components/ui/button";
import { useArcaneRecovery } from "@/lib/hooks/characters";
import type { SheetRest } from "@/types/characters";

function Picker({ offer }: { offer: NonNullable<SheetRest["arcaneRecovery"]> }) {
  const { campaignId, characterId } = useProfile();

  const { picks, total, canStep, step, canSubmit, submit } = useArcaneRecovery(campaignId, characterId, offer);

  return (
    <div aria-label="Arcane Recovery" className="mt-2 space-y-1 text-sm">
      <p className="text-hud-muted">
        Arcane Recovery: кіл відновлення {total} / {offer.budget}
      </p>
      {offer.slots.length === 0 && <p className="text-hud-muted">Немає витрачених слотів до {offer.maxSlotLevel}-го кола</p>}
      {offer.slots.map(({ level, spent }) => (
        <div key={level} className="flex min-h-9 items-center justify-between gap-2">
          <span className="text-hud-muted">
            {level}-е коло: витрачено {spent}
          </span>
          <span className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" aria-label={`Менше ${level}-го кола`} disabled={!canStep(level, -1)} onClick={() => step(level, -1)}>
              −
            </Button>
            <span aria-live="polite">{picks[level] ?? 0}</span>
            <Button type="button" size="sm" variant="outline" aria-label={`Більше ${level}-го кола`} disabled={!canStep(level, 1)} onClick={() => step(level, 1)}>
              +
            </Button>
          </span>
        </div>
      ))}
      <Button type="button" size="sm" disabled={!canSubmit} onClick={() => void submit()}>
        Відновити слоти
      </Button>
    </div>
  );
}

export function ArcaneRecoveryPanel() {
  const { sheet } = useProfile();

  const rest = sheet.rest;

  const offer = rest?.arcaneRecovery;

  if (!rest?.persist || !offer || !rest.shortRestOpen || rest.dead || !(sheet.viewer.isOwner || sheet.viewer.isDM)) return null;

  if (offer.used) return <p className="mt-2 text-sm text-hud-muted">Arcane Recovery використано — до довгого відпочинку</p>;

  return <Picker offer={offer} />;
}
