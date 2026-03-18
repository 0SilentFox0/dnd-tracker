"use client";

import { useMemo, useState } from "react";

import {
  BattleDialog,
  ConfirmCancelFooter,
} from "@/components/battle/dialogs/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getDiceSlots,
} from "@/lib/utils/battle/balance";
import { getParticipantExtras } from "@/lib/utils/battle/participant";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

interface DamageRollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attack: BattleAttack;
  damageDiceFormula?: string;
  /** Атакуючий — для відображення Advantage/Disadvantage на кидки шкоди */
  attacker?: BattleParticipant | null;
  /** Кількість цілей (для multi-target ranged — окремий кидок на ціль) */
  targetsCount?: number;
  onConfirm: (damageRolls: number[]) => void;
}

export function DamageRollDialog({
  open,
  onOpenChange,
  attack,
  damageDiceFormula,
  attacker,
  targetsCount = 1,
  onConfirm,
}: DamageRollDialogProps) {
  const baseDiceSlots = useMemo(() => {
    const formula = damageDiceFormula?.trim() || attack.damageDice?.trim();

    if (!formula) return [6];

    return getDiceSlots(formula);
  }, [damageDiceFormula, attack.damageDice]);

  const diceSlots = useMemo(() => {
    const base = baseDiceSlots.filter(
      (s): s is number => typeof s === "number" && Number.isFinite(s) && s >= 1,
    );

    if (base.length === 0) return [6];

    if (targetsCount <= 1) return base;

    return Array(targetsCount)
      .fill(null)
      .flatMap(() => base);
  }, [baseDiceSlots, targetsCount]);

  const displayFormula =
    damageDiceFormula?.trim() || attack.damageDice?.trim() || "1d6";

  const diceCount = diceSlots.length;

  const extras = attacker ? getParticipantExtras(attacker) : {};

  const hasAdvantageOnDamage = Boolean(extras.advantageOnAllRolls);

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

      const max = diceSlots[i] ?? 6;

      return !roll || Number.isNaN(n) || n < 1 || n > max;
    });

  return (
    <BattleDialog
      open={open}
      onOpenChange={onOpenChange}
      title="💥 Кидок Шкоди"
      description={
        targetsCount > 1
          ? `Окремий кидок на кожну ціль (${targetsCount} цілей): ${displayFormula} ${attack.damageType}`
          : `Введіть результати кидків для ${displayFormula} ${attack.damageType}`
      }
    >
      <div className="space-y-4">
        {hasAdvantageOnDamage && (
          <p className="text-sm text-green-600 dark:text-green-400">
            Advantage на кидки шкоди — введіть результат з урахуванням двох кидків (кращий)
          </p>
        )}
        <div className="space-y-4">
          {targetsCount > 1
            ? Array.from({ length: targetsCount }, (_, targetIndex) => {
                const dicePerTarget = baseDiceSlots.filter(
                  (s): s is number =>
                    typeof s === "number" && Number.isFinite(s) && s >= 1,
                ).length || 1;

                const start = targetIndex * dicePerTarget;

                const end = start + dicePerTarget;

                return (
                  <div
                    key={targetIndex}
                    className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2"
                  >
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      Ціль {targetIndex + 1}
                    </div>
                    {damageRolls.slice(start, end).map((roll, i) => {
                      const idx = start + i;

                      const sides = diceSlots[idx] ?? 6;

                      return (
                        <div key={idx}>
                          <Label>
                            Кидок {i + 1} (d{sides})
                          </Label>
                          <Input
                            type="number"
                            min={1}
                            max={sides}
                            value={roll}
                            onChange={(e) =>
                              handleRollChange(idx, e.target.value)
                            }
                            placeholder={`1-${sides}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })
            : damageRolls.map((roll, index) => {
                const sides = diceSlots[index] ?? 6;

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
                      onChange={(e) =>
                        handleRollChange(index, e.target.value)
                      }
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
