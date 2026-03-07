"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DamageCalculatorDiceInputsProps {
  diceSides: number[];
  values: number[];
  onValueChange: (index: number, value: number) => void;
  onCalculate: () => void;
  readOnly?: boolean;
}

export function DamageCalculatorDiceInputs({
  diceSides,
  values,
  onValueChange,
  onCalculate,
  readOnly = false,
}: DamageCalculatorDiceInputsProps) {
  if (diceSides.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Результати кидків</p>
      <div className="flex flex-wrap gap-2 items-center">
        {diceSides.map((sides, i) => (
          <label key={i} className="flex items-center gap-1">
            <span className="text-muted-foreground text-xs whitespace-nowrap">
              d{sides}
            </span>
            <Input
              type="number"
              min={1}
              max={sides}
              className="w-14 h-8 text-center tabular-nums"
              value={values[i] ?? 1}
              readOnly={readOnly}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!Number.isNaN(v)) onValueChange(i, Math.max(1, Math.min(sides, v)));
              }}
            />
          </label>
        ))}
        <Button type="button" size="sm" onClick={onCalculate}>
          Рахувати
        </Button>
      </div>
    </div>
  );
}
