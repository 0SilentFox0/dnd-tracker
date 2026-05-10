"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  /** Поточний розподіл, або null = за замовчуванням 100% усім */
  damageDistribution: number[] | null | undefined;
  onChange: (next: number[] | null) => void;
}

/**
 * Редактор розподілу AoE-шкоди по цілях.
 * Приклад: [100, 75, 50, 25] — перша ціль 100%, друга 75% тощо.
 *
 * `null` (порожній) означає "усі цілі 100%" (backward-compat). Перший
 * клік "Додати" поставляє [100], далі користувач додає скільки треба.
 */
export function SpellDamageDistributionField({
  damageDistribution,
  onChange,
}: Props) {
  const dist = damageDistribution ?? [];

  const addTarget = () => {
    if (dist.length === 0) {
      onChange([100]);

      return;
    }

    // Запропонуємо нове значення на основі останнього (-25%, нижня межа 0).
    const last = dist[dist.length - 1];

    const suggested = Math.max(0, last - 25);

    onChange([...dist, suggested]);
  };

  const updateTarget = (i: number, v: number) => {
    const next = [...dist];

    next[i] = Math.max(0, Math.min(100, v));
    onChange(next);
  };

  const removeTarget = (i: number) => {
    const next = dist.filter((_, j) => j !== i);

    onChange(next.length === 0 ? null : next);
  };

  const reset = () => onChange(null);

  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-medium">
          Розподіл шкоди по цілях (AoE)
        </Label>
        <div className="flex gap-1">
          {dist.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={reset}
              className="h-7 text-xs"
            >
              Скинути
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addTarget}
            className="h-7 text-xs"
          >
            <Plus className="mr-1 h-3 w-3" />
            Ціль
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        % шкоди на кожну послідовну ціль. Якщо порожньо — усі цілі отримують
        100% (стандартна поведінка).
      </p>
      {dist.length > 0 && (
        <div className="space-y-1.5">
          {dist.map((value, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-16 text-xs text-muted-foreground">
                Ціль {i + 1}:
              </span>
              <Input
                type="number"
                min={0}
                max={100}
                value={String(value)}
                onChange={(e) =>
                  updateTarget(
                    i,
                    e.target.value === "" ? 0 : parseInt(e.target.value, 10),
                  )
                }
                className="h-8 w-24 text-sm tabular-nums"
              />
              <span className="text-xs text-muted-foreground">%</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => removeTarget(i)}
                aria-label="Видалити ціль"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
