"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AttackType } from "@/lib/constants/battle";
import type { BattleAttack,BattleParticipant } from "@/types/battle";

interface AttackRollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attacker: BattleParticipant;
  attack: BattleAttack;
  target: BattleParticipant;
  onConfirm: (data: {
    attackRoll: number;
    advantageRoll?: number;
  }) => void;
}

/**
 * Діалог для введення кидка попадання (1d20 + бонуси)
 */
export function AttackRollDialog({
  open,
  onOpenChange,
  attacker,
  attack,
  target,
  onConfirm,
}: AttackRollDialogProps) {
  const [attackRoll, setAttackRoll] = useState("");

  const [advantageRoll, setAdvantageRoll] = useState("");

  // Розраховуємо бонус до атаки (спрощено, без урахування всіх модифікаторів)
  const attackBonus = attack.attackBonus || 0;

  const statModifier = attack.type === AttackType.MELEE
    ? Math.floor((attacker.abilities.strength - 10) / 2)
    : Math.floor((attacker.abilities.dexterity - 10) / 2);

  const totalBonus = attackBonus + statModifier + attacker.abilities.proficiencyBonus;

  const handleConfirm = () => {
    const roll = parseInt(attackRoll);

    if (roll >= 1 && roll <= 20) {
      const advantage = advantageRoll ? parseInt(advantageRoll) : undefined;

      if (advantage && (advantage < 1 || advantage > 20)) {
        alert("Кидок переваги має бути від 1 до 20");

        return;
      }

      onConfirm({
        attackRoll: roll,
        advantageRoll: advantage,
      });
      setAttackRoll("");
      setAdvantageRoll("");
      onOpenChange(false);
    } else {
      alert("Кидок має бути від 1 до 20");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto z-[100]">
        <DialogHeader>
          <DialogTitle>🎲 Кидок Попадання</DialogTitle>
          <DialogDescription>
            {attacker.basicInfo.name} атакує {target.basicInfo.name} зброєю {attack.name}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Результат кидка 1d20</Label>
            <Input
              type="number"
              min="1"
              max="20"
              value={attackRoll}
              onChange={(e) => setAttackRoll(e.target.value)}
              placeholder="Введіть результат (1-20)"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Бонус до атаки: +{totalBonus} (базовий: +{attackBonus}, модифікатор: {statModifier >= 0 ? "+" : ""}{statModifier}, proficiency: +{attacker.abilities.proficiencyBonus})
            </p>
            <p className="text-xs text-muted-foreground">
              Загальне значення: {attackRoll ? `${parseInt(attackRoll) + totalBonus}` : "?"} vs AC {target.combatStats.armorClass}
            </p>
          </div>
          <div>
            <Label>Кидок переваги (опціонально)</Label>
            <Input
              type="number"
              min="1"
              max="20"
              value={advantageRoll}
              onChange={(e) => setAdvantageRoll(e.target.value)}
              placeholder="Введіть результат (1-20) або залиште порожнім"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Використовується найкращий результат з двох кидків
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAttackRoll("");
                setAdvantageRoll("");
                onOpenChange(false);
              }}
              className="flex-1 min-h-[44px] touch-manipulation"
            >
              Скасувати
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={!attackRoll || parseInt(attackRoll) < 1 || parseInt(attackRoll) > 20}
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
