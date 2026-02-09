"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { AllyStats, Difficulty, SuggestedEnemy } from "./types";

interface AutopickCardProps {
  hasAllies: boolean;
  allyStats: AllyStats | null;
  balanceLoading: boolean;
  difficulty: Difficulty;
  minTier: number;
  maxTier: number;
  balanceRace: string;
  races: { id: string; name: string }[];
  suggestedEnemies: SuggestedEnemy[];
  onDifficultyChange: (value: Difficulty) => void;
  onMinTierChange: (value: number) => void;
  onMaxTierChange: (value: number) => void;
  onBalanceRaceChange: (value: string) => void;
  onFetchAllyStats: () => void;
  onSuggestEnemies: () => void;
  onApplySuggestedEnemies: () => void;
}

export function AutopickCard({
  hasAllies,
  allyStats,
  balanceLoading,
  difficulty,
  minTier,
  maxTier,
  balanceRace,
  races,
  suggestedEnemies,
  onDifficultyChange,
  onMinTierChange,
  onMaxTierChange,
  onBalanceRaceChange,
  onFetchAllyStats,
  onSuggestEnemies,
  onApplySuggestedEnemies,
}: AutopickCardProps) {
  const totalSuggestedDpr = Math.round(
    suggestedEnemies.reduce((sum, s) => sum + s.totalDpr, 0) * 10,
  ) / 10;
  const totalSuggestedHp = suggestedEnemies.reduce(
    (sum, s) => sum + s.totalHp,
    0,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>⚖️ Автопідбір ворогів</CardTitle>
        <CardDescription>
          Цільові DPR та HP ворогів відповідають союзникам (середній бій 1:1).
          Оберіть складність і фільтри, підберіть юнітів.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasAllies ? (
          <>
            <div className="flex flex-wrap items-center gap-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onFetchAllyStats}
                disabled={balanceLoading}
              >
                {balanceLoading
                  ? "Завантаження…"
                  : "Оновити статистику союзників"}
              </Button>
              {allyStats && (
                <span className="text-sm text-muted-foreground">
                  DPR: <strong>{allyStats.dpr}</strong>, Total HP:{" "}
                  <strong>{allyStats.totalHp}</strong>
                </span>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label htmlFor="difficulty">Складність</Label>
                <select
                  id="difficulty"
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                  value={difficulty}
                  onChange={(e) =>
                    onDifficultyChange(e.target.value as Difficulty)
                  }
                >
                  <option value="easy">Легкий (0.5× DPR/HP)</option>
                  <option value="medium">Середній (1:1 DPR/HP)</option>
                  <option value="hard">Важкий (1.5× DPR/HP)</option>
                </select>
              </div>
              <div>
                <Label htmlFor="minTier">Мін. рівень (tier)</Label>
                <Input
                  id="minTier"
                  type="number"
                  min={1}
                  max={30}
                  value={minTier}
                  onChange={(e) =>
                    onMinTierChange(parseInt(e.target.value, 10) || 1)
                  }
                />
              </div>
              <div>
                <Label htmlFor="maxTier">Макс. рівень (tier)</Label>
                <Input
                  id="maxTier"
                  type="number"
                  min={1}
                  max={30}
                  value={maxTier}
                  onChange={(e) =>
                    onMaxTierChange(parseInt(e.target.value, 10) || 10)
                  }
                />
              </div>
              <div>
                <Label htmlFor="balanceRace">Раса юнітів</Label>
                <select
                  id="balanceRace"
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs max-w-xs"
                  value={balanceRace}
                  onChange={(e) => onBalanceRaceChange(e.target.value)}
                >
                  <option value="">Будь-яка</option>
                  {races.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={onSuggestEnemies}
                disabled={balanceLoading}
              >
                {balanceLoading ? "Підбір…" : "Підібрати ворогів"}
              </Button>
              {suggestedEnemies.length > 0 && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onApplySuggestedEnemies}
                >
                  Застосувати рекомендацію
                </Button>
              )}
            </div>
            {suggestedEnemies.length > 0 && (
              <div className="rounded-md border p-3 text-sm">
                <p className="font-medium mb-2">
                  Рекомендовані вороги
                  <span className="ml-2 font-normal text-muted-foreground">
                    (DPR: {totalSuggestedDpr} · HP: {totalSuggestedHp})
                  </span>
                </p>
                <ul className="space-y-1">
                  {suggestedEnemies.map((s) => (
                    <li key={s.unitId}>
                      {s.name} ×{s.quantity} (DPR: {s.totalDpr}, HP: {s.totalHp})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Додайте союзників зліва, щоб підібрати ворогів за DPR та HP.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
