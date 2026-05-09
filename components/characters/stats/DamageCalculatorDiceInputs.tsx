"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DamageCalculatorDiceInputsProps {
  diceSides: number[];
  onSubmitRolls: (parsedRolls: number[]) => void;
  readOnly?: boolean;
  /** Опційно: tag для логу (напр. "melee" / "ranged" / "magic"). */
  logTag?: string;
}

/** Для суми: ціле з рядка; нечисловий ввід дає 0. */
function parseDiceField(raw: string): number {
  const n = parseInt(String(raw).trim(), 10);

  return Number.isNaN(n) ? 0 : n;
}

export function DamageCalculatorDiceInputs({
  diceSides,
  onSubmitRolls,
  readOnly = false,
  logTag,
}: DamageCalculatorDiceInputsProps) {
  const [texts, setTexts] = useState<string[]>(() => diceSides.map(() => ""));

  if (diceSides.length === 0) return null;

  const handleCalculate = () => {
    const rolls = diceSides.map((_, i) => parseDiceField(texts[i] ?? ""));

    const sum = rolls.reduce((a, b) => a + b, 0);

    console.info(`[damage-calc] Рахувати${logTag ? ` (${logTag})` : ""}`, {
      diceSides,
      texts: texts.slice(0, diceSides.length),
      rolls,
      sum,
    });

    onSubmitRolls(rolls);
  };

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
              autoComplete="off"
              className="min-w-18 h-8 text-center tabular-nums"
              value={texts[i] ?? ""}
              readOnly={readOnly}
              onChange={(e) => {
                const next = e.target.value;

                setTexts((prev) => {
                  const copy = [...prev];

                  while (copy.length < diceSides.length) {
                    copy.push("");
                  }

                  copy[i] = next;

                  return copy;
                });
              }}
            />
          </label>
        ))}
        <Button type="button" size="sm" onClick={handleCalculate}>
          Рахувати
        </Button>
      </div>
    </div>
  );
}
