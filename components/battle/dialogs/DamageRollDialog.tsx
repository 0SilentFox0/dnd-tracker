"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseDiceNotationToGroups } from "@/lib/utils/battle/balance-calculations";
import type { BattleAttack } from "@/types/battle";

interface DamageRollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attack: BattleAttack;
  /** Повна формула кубиків для кидка (зброя + кубики за рівнем). Наприклад "2d6+3d8". Якщо не передано — використовується лише attack.damageDice. */
  damageDiceFormula?: string;
  onConfirm: (damageRolls: number[]) => void;
}

/**
 * Повертає плоский список граней для кожного кубика: "2d6+3d8" → [6, 6, 8, 8, 8].
 */
function getDiceSlots(formula: string): number[] {
  const groups = parseDiceNotationToGroups(formula);
  const slots: number[] = [];
  for (const g of groups) {
    for (let i = 0; i < g.count; i++) slots.push(g.sides);
  }
  return slots;
}

/**
 * Діалог для введення кидків шкоди (кубики окремо).
 * Підтримує повну формулу (2d6+3d8) — виводить поля для всіх кубиків.
 */
export function DamageRollDialog({
  open,
  onOpenChange,
  attack,
  damageDiceFormula,
  onConfirm,
}: DamageRollDialogProps) {
  const diceSlots = useMemo(() => {
    const formula = damageDiceFormula?.trim() || attack.damageDice?.trim();
    if (!formula) return [6];
    return getDiceSlots(formula);
  }, [damageDiceFormula, attack.damageDice]);

  const displayFormula =
    damageDiceFormula?.trim() || attack.damageDice?.trim() || "1d6";
  const diceCount = diceSlots.length;

  const [damageRolls, setDamageRolls] = useState<string[]>(
    Array(diceCount).fill(""),
  );

  const handleRollChange = (index: number, value: string) => {
    const newRolls = [...damageRolls];
    newRolls[index] = value;
    setDamageRolls(newRolls);
  };

  const handleConfirm = () => {
    const rolls = damageRolls
      .map((roll) => parseInt(roll, 10))
      .filter((r) => !Number.isNaN(r));

    const valid =
      rolls.length === diceCount &&
      rolls.every((roll, i) => roll >= 1 && roll <= diceSlots[i]);

    if (valid) {
      onConfirm(rolls);
      setDamageRolls(Array(diceCount).fill(""));
      onOpenChange(false);
    } else {
      alert(`Введіть ${diceCount} значень: кожне від 1 до відповідного d (d6=1-6, d8=1-8 тощо).`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto z-[100]">
        <DialogHeader>
          <DialogTitle>💥 Кидок Шкоди</DialogTitle>
          <DialogDescription>
            Введіть результати кидків для {displayFormula} {attack.damageType}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            {damageRolls.map((roll, index) => {
              const sides = diceSlots[index];
              return (
                <div key={index}>
                  <Label>
                    Кидок {index + 1} (d{sides})
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={sides}
                    value={roll}
                    onChange={(e) => handleRollChange(index, e.target.value)}
                    placeholder={`1-${sides}`}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDamageRolls(Array(diceCount).fill(""));
                onOpenChange(false);
              }}
              className="flex-1 min-h-[44px] touch-manipulation"
            >
              Скасувати
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={
                damageRolls.length !== diceCount ||
                damageRolls.some((roll, i) => {
                  const n = parseInt(roll, 10);
                  const max = diceSlots[i];
                  return !roll || Number.isNaN(n) || n < 1 || n > max;
                })
              }
              className="flex-1 min-h-[44px] touch-manipulation"
            >
              Підтвердити
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
