"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  // Парсимо damageDice (наприклад, "2d6+3" → 2 кубики)
  const parseDamageDice = (dice: string): number => {
    const match = dice.match(/(\d+)d\d+/);

    return match ? parseInt(match[1]) : 1;
  };

  const diceCount = parseDamageDice(attack.damageDice);

  const [damageRolls, setDamageRolls] = useState<string[]>(
    Array(diceCount).fill("")
  );

  const handleRollChange = (index: number, value: string) => {
    const newRolls = [...damageRolls];

    newRolls[index] = value;
    setDamageRolls(newRolls);
  };

  const handleConfirm = () => {
    const rolls = damageRolls.map((roll) => parseInt(roll)).filter((roll) => !isNaN(roll));

    if (rolls.length === diceCount && rolls.every((roll) => roll > 0)) {
      onConfirm(rolls);
      setDamageRolls(Array(diceCount).fill(""));
      onOpenChange(false);
    } else {
      alert(`Потрібно ввести ${diceCount} валідних кидків`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>💥 Кидок Шкоди</DialogTitle>
          <DialogDescription>
            Введіть результати кидків для {attack.damageDice} {attack.damageType}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            {damageRolls.map((roll, index) => (
              <div key={index}>
                <Label>Кидок {index + 1}</Label>
                <Input
                  type="number"
                  min="1"
                  value={roll}
                  onChange={(e) => handleRollChange(index, e.target.value)}
                  placeholder={`Кидок ${index + 1}`}
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
                damageRolls.some((roll) => !roll || parseInt(roll) < 1)
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
