"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getHeroMaxHpBreakdown } from "@/lib/constants/hero-scaling";

interface CharacterHpPreviewProps {
  level: number;
  strength: number;
  /** Коефіціент масштабування (×). Редагується лише DM. */
  coefficient?: number;
  onCoefficientChange?: (value: number) => void;
  /** Чи поточний користувач DM (може змінювати коефіціент) */
  isDm?: boolean;
}

/**
 * Показує обчислене HP героя та спосіб обрахунку (як для melee damage).
 * У режимі DM у правому верхньому кутку — коефіціент, який можна змінити.
 */
export function CharacterHpPreview({
  level,
  strength,
  coefficient = 1,
  onCoefficientChange,
  isDm,
}: CharacterHpPreviewProps) {
  const { total, breakdown } = getHeroMaxHpBreakdown(level, strength, {
    hpMultiplier: coefficient,
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1.5">
            <CardTitle className="text-base">Здоровʼя (HP)</CardTitle>
            <CardDescription>
              Обрахунок за рівнем та силою (у бою використовується це значення)
            </CardDescription>
          </div>
          {isDm && (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                ×
              </span>
              <Input
                type="number"
                min={0.1}
                max={3}
                step={0.1}
                className="h-8 w-24 text-left tabular-nums"
                value={coefficient}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);

                  if (!Number.isNaN(v) && v >= 0.1 && v <= 3)
                    onCoefficientChange?.(v);
                }}
              />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-2xl font-semibold tabular-nums">{total}</p>
        {breakdown.length > 0 && (
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            {breakdown.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
