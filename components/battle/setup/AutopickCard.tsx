"use client";

import { HudSection } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { BalanceSuggestions } from "@/lib/hooks/battles";
import type { IdName } from "@/types/common";

interface AutopickCardProps {
  hasAllies: boolean;
  races: IdName[];
  balance: BalanceSuggestions;
}

export function AutopickCard({ hasAllies, races, balance }: AutopickCardProps) {
  const { loading, race, suggested, done, actions } = balance;

  return (
    <HudSection title="Підбір ворогів" className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Система підбирає склад і сама масштабує HP та шкоду ворогів під силу героїв, щоб бій тривав ~3–4 раунди.
      </p>
      {hasAllies ? (
        <>
          <div className="max-w-xs">
            <Label htmlFor="balanceRace">Раса юнітів</Label>
            <select
              id="balanceRace"
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
              value={race}
              onChange={(e) => actions.setRace(e.target.value)}
            >
              <option value="">Будь-яка</option>
              {races.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={actions.suggest} disabled={loading}>
              {loading ? "Підбір…" : "Підібрати"}
            </Button>
            {suggested.length > 0 && (
              <Button type="button" variant="secondary" onClick={actions.apply}>
                Застосувати рекомендацію
              </Button>
            )}
          </div>
          {suggested.length > 0 && (
            <div className="rounded-md border p-3 text-sm">
              <p className="mb-2 font-medium">Рекомендовані вороги</p>
              <ul className="space-y-1">
                {suggested.map((s) => (
                  <li key={s.unitId}>
                    {s.name} ×{s.quantity}
                    {s.hpMult != null && s.dmgMult != null && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ×{s.hpMult} HP · ×{s.dmgMult} шкода
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {done && suggested.length === 0 && <p className="text-sm text-muted-foreground">Немає підходящих юнітів для цієї раси.</p>}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Додайте союзників зліва, щоб підібрати ворогів.</p>
      )}
    </HudSection>
  );
}
