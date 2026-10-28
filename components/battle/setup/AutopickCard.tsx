"use client";

import { HudSection } from "@/components/hud/form";
import { HudChipTabs } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import type { BalanceSuggestions } from "@/lib/hooks/battles";
import { XP_DIFFICULTIES, XP_DIFFICULTY_LABELS } from "@/lib/utils/battle/balance/xp-budget";
import type { IdName } from "@/types/common";

interface AutopickCardProps {
  hasAllies: boolean;
  races: IdName[];
  balance: BalanceSuggestions;
}

export function AutopickCard({ hasAllies, races, balance }: AutopickCardProps) {
  const { isLoading, race, suggested, done, actions, xp } = balance;

  return (
    <HudSection title="Підбір ворогів" className="space-y-4">
      <p className="text-xs text-muted-foreground">
        {xp.enabled
          ? "Система підбирає склад під бюджет XP 5e обраної складності — без масштабування HP і шкоди."
          : "Система підбирає склад і сама масштабує HP та шкоду ворогів під силу героїв, щоб бій тривав ~3–4 раунди."}
      </p>
      {hasAllies ? (
        <>
          <div className="max-w-xs">
            <Label htmlFor="balanceRace">Раса юнітів</Label>
            <SelectField
              id="balanceRace"
              className="mt-1"
              value={race}
              onValueChange={actions.setRace}
              allowNone
              noneLabel="Будь-яка"
              options={races.map((r) => ({ value: r.id, label: r.name }))}
            />
          </div>
          {xp.enabled && (
            <HudChipTabs
              ariaLabel="Складність"
              items={XP_DIFFICULTIES[xp.edition].map((d) => ({ key: d, label: XP_DIFFICULTY_LABELS[d], active: xp.difficulty === d, onSelect: () => actions.setDifficulty(d) }))}
            />
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={actions.suggest} disabled={isLoading}>
              {isLoading ? "Підбір…" : "Підібрати"}
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
                    {s.xp !== undefined && <span className="ml-2 text-xs text-muted-foreground">XP {s.xp}</span>}
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
