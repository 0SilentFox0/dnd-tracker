"use client";

import { HudSection } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { SuggestedEnemy } from "@/types/battle-setup";

interface AutopickCardProps {
  hasAllies: boolean;
  balanceLoading: boolean;
  balanceRace: string;
  races: { id: string; name: string }[];
  suggestedEnemies: SuggestedEnemy[];
  suggestDone: boolean;
  actions: {
    onBalanceRaceChange: (value: string) => void;
    onSuggestEnemies: () => void;
    onApplySuggestedEnemies: () => void;
  };
}

export function AutopickCard({ hasAllies, balanceLoading, balanceRace, races, suggestedEnemies, suggestDone, actions }: AutopickCardProps) {
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
              value={balanceRace}
              onChange={(e) => actions.onBalanceRaceChange(e.target.value)}
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
            <Button type="button" onClick={actions.onSuggestEnemies} disabled={balanceLoading}>
              {balanceLoading ? "Підбір…" : "Підібрати"}
            </Button>
            {suggestedEnemies.length > 0 && (
              <Button type="button" variant="secondary" onClick={actions.onApplySuggestedEnemies}>
                Застосувати рекомендацію
              </Button>
            )}
          </div>
          {suggestedEnemies.length > 0 && (
            <div className="rounded-md border p-3 text-sm">
              <p className="mb-2 font-medium">Рекомендовані вороги</p>
              <ul className="space-y-1">
                {suggestedEnemies.map((s) => (
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
          {suggestDone && suggestedEnemies.length === 0 && <p className="text-sm text-muted-foreground">Немає підходящих юнітів для цієї раси.</p>}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Додайте союзників зліва, щоб підібрати ворогів.</p>
      )}
    </HudSection>
  );
}
