"use client";

import { useState } from "react";

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
import type { BattleAttack } from "@/types/battle";

interface DamageRollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attack: BattleAttack;
  onConfirm: (damageRolls: number[]) => void;
}

/**
 * Діалог для введення кидків шкоди (кубики окремо)
 */
export function DamageRollDialog({
  open,
  onOpenChange,
  attack,
  onConfirm,
}: DamageRollDialogProps) {
  // Парсимо damageDice (наприклад, "2d6+3" → 2 кубики по 6 граней)
  const parseDamageDice = (dice: string): { count: number; sides: number } => {
    const match = dice.match(/(\d+)d(\d+)/);

    return match
      ? { count: parseInt(match[1]), sides: parseInt(match[2]) }
      : { count: 1, sides: 100 }; // Fallback
  };

  const { count: diceCount, sides: diceSides } = parseDamageDice(
    attack.damageDice,
  );

  const [damageRolls, setDamageRolls] = useState<string[]>(
    Array(diceCount).fill(""),
  );

  const handleRollChange = (index: number, value: string) => {
    const newRolls = [...damageRolls];
    // Обмежуємо значення, якщо введено більше ніж макс
    const numericValue = parseInt(value);
    if (!isNaN(numericValue) && numericValue > diceSides) {
      // Optional: auto-clamp or just let validation handle it?
      // Let's just update value, Input max will handle UI hint, helper text helps too.
      // Actually, let's clamp it if user pastes? No, standard behavior is allow typing and validate.
    }

    newRolls[index] = value;
    setDamageRolls(newRolls);
  };

  const handleConfirm = () => {
    const rolls = damageRolls
      .map((roll) => parseInt(roll))
      .filter((roll) => !isNaN(roll));

    if (
      rolls.length === diceCount &&
      rolls.every((roll) => roll > 0 && roll <= diceSides)
    ) {
      onConfirm(rolls);
      setDamageRolls(Array(diceCount).fill(""));
      onOpenChange(false);
    } else {
      alert(`Введіть ${diceCount} значень від 1 до ${diceSides}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>💥 Кидок Шкоди</DialogTitle>
          <DialogDescription>
            Введіть результати кидків для {attack.damageDice}{" "}
            {attack.damageType}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            {damageRolls.map((roll, index) => (
              <div key={index}>
                <Label>
                  Кидок {index + 1} (d{diceSides})
                </Label>
                <Input
                  type="number"
                  min="1"
                  max={diceSides}
                  value={roll}
                  onChange={(e) => handleRollChange(index, e.target.value)}
                  placeholder={`1-${diceSides}`}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDamageRolls(Array(diceCount).fill(""));
                onOpenChange(false);
              }}
              className="flex-1"
            >
              Скасувати
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={
                damageRolls.length !== diceCount ||
                damageRolls.some(
                  (roll) =>
                    !roll || parseInt(roll) < 1 || parseInt(roll) > diceSides,
                )
              }
              className="flex-1"
            >
              Підтвердити
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
