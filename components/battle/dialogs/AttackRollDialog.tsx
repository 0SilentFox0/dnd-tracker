"use client";

import { useState } from "react";

import {
  BattleDialog,
  ConfirmCancelFooter,
} from "@/components/battle/dialogs/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { hasAdvantage, hasDisadvantage } from "@/lib/utils/battle/attack";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

interface AttackRollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attacker: BattleParticipant;
  attack: BattleAttack;
  target: BattleParticipant;
  canSeeEnemyHp?: boolean;
  onConfirm: (data: {
    attackRoll: number;
    advantageRoll?: number;
    disadvantageRoll?: number;
  }) => void;
}

export function AttackRollDialog({
  open,
  onOpenChange,
  attacker,
  attack,
  target,
  canSeeEnemyHp = false,
  onConfirm,
}: AttackRollDialogProps) {
  const [attackRoll, setAttackRoll] = useState("");

  const [advantageRoll, setAdvantageRoll] = useState("");

  const [disadvantageRoll, setDisadvantageRoll] = useState("");

  const attackBonus = attack.attackBonus || 0;

  const statModifier =
    attack.type === AttackType.MELEE
      ? Math.floor((attacker.abilities.strength - 10) / 2)
      : Math.floor((attacker.abilities.dexterity - 10) / 2);

  const totalBonus =
    attackBonus + statModifier + attacker.abilities.proficiencyBonus;

  const hasAdvantageOnAttack = hasAdvantage(attacker, attack);

  const hasDisadvantageOnAttack = hasDisadvantage(attacker, attack);

  const handleCancel = () => {
    setAttackRoll("");
    setAdvantageRoll("");
    setDisadvantageRoll("");
    onOpenChange(false);
  };

  const handleConfirm = () => {
    const roll = parseInt(attackRoll, 10);

    if (roll >= 1 && roll <= 20) {
      const advantage = advantageRoll ? parseInt(advantageRoll, 10) : undefined;

      const disadvantage = disadvantageRoll ? parseInt(disadvantageRoll, 10) : undefined;

      if (advantage != null && (advantage < 1 || advantage > 20)) {
        alert("Кидок переваги має бути від 1 до 20");

        return;
      }

      if (disadvantage != null && (disadvantage < 1 || disadvantage > 20)) {
        alert("Кидок недоліку має бути від 1 до 20");

        return;
      }

      onConfirm({ attackRoll: roll, advantageRoll: advantage, disadvantageRoll: disadvantage });
      handleCancel();
    } else {
      alert("Кидок має бути від 1 до 20");
    }
  };

  return (
    <BattleDialog
      open={open}
      onOpenChange={onOpenChange}
      title="🎲 Кидок Попадання"
      description={`${attacker.basicInfo.name} атакує ${target.basicInfo.name} зброєю ${attack.name}`}
    >
      <div className="space-y-4">
        <div>
          <Label>Результат кидка 1d20</Label>
          <Input
            type="number"
            min={1}
            max={20}
            value={attackRoll}
            onChange={(e) => setAttackRoll(e.target.value)}
            placeholder="Введіть результат (1-20)"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Бонус до атаки: +{totalBonus} (базовий: +{attackBonus}, модифікатор:{" "}
            {statModifier >= 0 ? "+" : ""}
            {statModifier}, proficiency: +{attacker.abilities.proficiencyBonus})
          </p>
          <p className="text-xs text-muted-foreground">
            Загальне значення:{" "}
            {attackRoll ? `${parseInt(attackRoll, 10) + totalBonus}` : "?"} vs AC{" "}
            {canSeeEnemyHp || target.basicInfo.side === ParticipantSide.ALLY
              ? target.combatStats.armorClass
              : "?"}
          </p>
        </div>
        {hasAdvantageOnAttack && !hasDisadvantageOnAttack && (
          <div>
            <Label>Advantage — другий кидок d20</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={advantageRoll}
              onChange={(e) => setAdvantageRoll(e.target.value)}
              placeholder="Введіть результат (1-20)"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Використовується найкращий результат з двох кидків
            </p>
          </div>
        )}
        {hasDisadvantageOnAttack && !hasAdvantageOnAttack && (
          <div>
            <Label>Disadvantage — другий кидок d20</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={disadvantageRoll}
              onChange={(e) => setDisadvantageRoll(e.target.value)}
              placeholder="Введіть результат (1-20)"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Використовується найменший результат з двох кидків
            </p>
          </div>
        )}
        {hasAdvantageOnAttack && hasDisadvantageOnAttack && (
          <p className="text-sm text-amber-500">
            Advantage і Disadvantage скасовують одне одного — звичайний кидок
          </p>
        )}
        <ConfirmCancelFooter
          onCancel={handleCancel}
          confirmLabel="Підтвердити"
          onConfirm={handleConfirm}
          confirmDisabled={
            !attackRoll ||
            parseInt(attackRoll, 10) < 1 ||
            parseInt(attackRoll, 10) > 20
          }
        />
      </div>
    </BattleDialog>
  );
}
