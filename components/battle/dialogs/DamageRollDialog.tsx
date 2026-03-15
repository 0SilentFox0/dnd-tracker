"use client";

import { useMemo, useState } from "react";

import {
  BattleDialog,
  ConfirmCancelFooter,
} from "@/components/battle/dialogs/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseDiceNotationToGroups } from "@/lib/utils/battle/balance-calculations";
import type { BattleAttack } from "@/types/battle";

interface DamageRollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attack: BattleAttack;
  damageDiceFormula?: string;
  onConfirm: (damageRolls: number[]) => void;
}

function getDiceSlots(formula: string): number[] {
  const groups = parseDiceNotationToGroups(formula);

  const slots: number[] = [];

  for (const g of groups) {
    for (let i = 0; i < g.count; i++) slots.push(g.sides);
  }

  return slots;
}

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

  const handleCancel = () => {
    setDamageRolls(Array(diceCount).fill(""));
    onOpenChange(false);
  };

  const handleConfirm = () => {
    const rolls = damageRolls
      .map((r) => parseInt(r, 10))
      .filter((n) => !Number.isNaN(n));

    const valid =
      rolls.length === diceCount &&
      rolls.every((r, i) => r >= 1 && r <= diceSlots[i]);

    if (valid) {
      onConfirm(rolls);
      handleCancel();
    } else {
      alert(
        `Введіть ${diceCount} значень: кожне від 1 до відповідного d (d6=1-6, d8=1-8 тощо).`,
      );
    }
  };

  const isInvalid =
    damageRolls.length !== diceCount ||
    damageRolls.some((roll, i) => {
      const n = parseInt(roll, 10);

      const max = diceSlots[i];

      return !roll || Number.isNaN(n) || n < 1 || n > max;
    });

  return (
    <BattleDialog
      open={open}
      onOpenChange={onOpenChange}
      title="💥 Кидок Шкоди"
      description={`Введіть результати кидків для ${displayFormula} ${attack.damageType}`}
    >
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
        <ConfirmCancelFooter
          onCancel={handleCancel}
          confirmLabel="Підтвердити"
          onConfirm={handleConfirm}
          confirmDisabled={isInvalid}
        />
      </div>
    </BattleDialog>
  );
}
