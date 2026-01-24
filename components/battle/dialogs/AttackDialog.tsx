"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import type { BattleScene } from "@/types/api";
import type { BattleParticipant } from "@/types/battle";
import type { BattleAttack } from "@/types/battle";

interface AttackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attacker: BattleParticipant | null;
  battle: BattleScene | null;
  availableTargets: BattleParticipant[];
  isDM: boolean;
  canSeeEnemyHp: boolean;
  onAttack: (data: {
    attackerId: string;
    attackerType?: "character" | "unit";
    targetId: string;
    targetType?: "character" | "unit";
    attackId?: string;
    attackRoll: number;
    advantageRoll?: number;
    damageRolls: number[];
  }) => void;
}

export function AttackDialog({
  open,
  onOpenChange,
  attacker,
  battle,
  availableTargets,
  isDM,
  canSeeEnemyHp,
  onAttack,
}: AttackDialogProps) {
  const [selectedAttack, setSelectedAttack] = useState<BattleAttack | null>(null);

  const [selectedTarget, setSelectedTarget] = useState<BattleParticipant | null>(null);

  const [attackRoll, setAttackRoll] = useState("");

  const [advantageRoll, setAdvantageRoll] = useState("");

  const [damageRolls, setDamageRolls] = useState<string[]>([]);

  // Визначаємо чи потрібен Advantage (ельфи з ranged зброєю)
  const needsAdvantage = attacker?.abilities.race === "elf" && selectedAttack?.type === AttackType.RANGED;

  // Парсимо damageDice для визначення кількості кубиків
  const parseDamageDice = (dice: string): { count: number; type: number; modifier?: number } => {
    const match = dice.match(/(\d+)d(\d+)([+-]\d+)?/);

    if (!match) return { count: 1, type: 6 };

    return {
      count: parseInt(match[1]) || 1,
      type: parseInt(match[2]) || 6,
      modifier: match[3] ? parseInt(match[3]) : undefined,
    };
  };

  const damageDiceInfo = selectedAttack ? parseDamageDice(selectedAttack.damageDice) : null;

  const handleAttack = () => {
    if (!attacker || !selectedTarget || !selectedAttack || !attackRoll) return;

    onAttack({
      attackerId: attacker.basicInfo.id,
      attackerType: attacker.basicInfo.sourceType,
      targetId: selectedTarget.basicInfo.id,
      targetType: selectedTarget.basicInfo.sourceType,
      attackId: selectedAttack.id,
      attackRoll: parseInt(attackRoll),
      advantageRoll: advantageRoll ? parseInt(advantageRoll) : undefined,
      damageRolls: damageRolls.map((r) => parseInt(r)).filter((n) => !isNaN(n)),
    });

    // Скидаємо форму
    setSelectedAttack(null);
    setSelectedTarget(null);
    setAttackRoll("");
    setAdvantageRoll("");
    setDamageRolls([]);
  };

  // Скидаємо форму при закритті
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedAttack(null);
      setSelectedTarget(null);
      setAttackRoll("");
      setAdvantageRoll("");
      setDamageRolls([]);
    }

    onOpenChange(open);
  };

  if (!attacker || !battle) {
    return null;
  }

  const availableAttacks = attacker.battleData.attacks || [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>⚔️ Атака</DialogTitle>
          <DialogDescription>
            {attacker.basicInfo.name} атакує {selectedTarget?.basicInfo.name || "ціль"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Вибір зброї */}
          {availableAttacks.length > 0 && (
            <div>
              <Label>Зброя</Label>
              <SelectField
                value={selectedAttack?.id || selectedAttack?.name || ""}
                onValueChange={(value) => {
                  const attack = availableAttacks.find(
                    a => a.id === value || a.name === value
                  );

                  setSelectedAttack(attack || null);
                }}
                placeholder="Оберіть зброю"
                options={availableAttacks.map(attack => ({
                  value: attack.id || attack.name,
                  label: `${attack.name} (${attack.type}) - ${attack.damageDice} ${attack.damageType}`,
                }))}
              />
            </div>
          )}

          {/* Вибір цілі */}
          <div>
            <Label>Ціль</Label>
            <SelectField
              value={selectedTarget?.basicInfo.id || ""}
              onValueChange={(value) => {
                const target = battle.initiativeOrder.find(
                  p => p.basicInfo.id === value
                );

                setSelectedTarget(target || null);
              }}
              placeholder="Оберіть ціль"
              options={availableTargets.map(target => ({
                value: target.basicInfo.id,
                label: `${target.basicInfo.name}${(isDM || canSeeEnemyHp || target.basicInfo.side === ParticipantSide.ALLY) ? ` (HP: ${target.combatStats.currentHp}/${target.combatStats.maxHp})` : ""}`,
              }))}
            />
          </div>

          {/* AC цілі */}
          {selectedTarget && (
            <div>
              <Label>
                AC цілі: {(isDM || selectedTarget.basicInfo.side === ParticipantSide.ALLY) ? selectedTarget.combatStats.armorClass : "?"}
              </Label>
            </div>
          )}

          {/* Attack Roll */}
          <div>
            <Label>Результат кидка d20</Label>
            <Input
              type="number"
              min="1"
              max="20"
              value={attackRoll}
              onChange={(e) => setAttackRoll(e.target.value)}
              placeholder="Введіть результат кидка"
            />
          </div>

          {/* Advantage Roll (для ельфів з ranged) */}
          {needsAdvantage && (
            <div>
              <Label>Другий кидок d20 (Advantage)</Label>
              <Input
                type="number"
                min="1"
                max="20"
                value={advantageRoll}
                onChange={(e) => setAdvantageRoll(e.target.value)}
                placeholder="Введіть другий кидок"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Ельфійське вміння: обирається кращий результат
              </p>
            </div>
          )}

          {/* Damage Rolls */}
          {selectedAttack && damageDiceInfo && (
            <div>
              <Label>Кубики урону ({selectedAttack.damageDice})</Label>
              <div className="space-y-2">
                {Array.from({ length: damageDiceInfo.count }).map((_, index) => (
                  <Input
                    key={index}
                    type="number"
                    min="1"
                    max={damageDiceInfo.type}
                    value={damageRolls[index] || ""}
                    onChange={(e) => {
                      const newRolls = [...damageRolls];

                      newRolls[index] = e.target.value;
                      setDamageRolls(newRolls);
                    }}
                    placeholder={`Кубик ${index + 1} (1-${damageDiceInfo.type})`}
                  />
                ))}
                {damageDiceInfo.modifier && (
                  <p className="text-xs text-muted-foreground">
                    Модифікатор: {damageDiceInfo.modifier > 0 ? "+" : ""}{damageDiceInfo.modifier}
                  </p>
                )}
              </div>
            </div>
          )}

          <Button
            onClick={handleAttack}
            disabled={!selectedTarget || !selectedAttack || !attackRoll || (needsAdvantage && !advantageRoll)}
            className="w-full"
          >
            Застосувати атаку
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
