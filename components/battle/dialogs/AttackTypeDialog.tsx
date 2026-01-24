"use client";

import { useState } from "react";
import { Crosshair,Sword } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AttackType } from "@/lib/constants/battle";
import type { BattleAttack,BattleParticipant } from "@/types/battle";

interface AttackTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participant: BattleParticipant;
  onSelect: (type: AttackType, attack: BattleAttack) => void;
}

/**
 * Діалог вибору типу атаки (ближня/дальня) та зброї
 */
export function AttackTypeDialog({
  open,
  onOpenChange,
  participant,
  onSelect,
}: AttackTypeDialogProps) {
  const [selectedType, setSelectedType] = useState<AttackType | null>(null);

  const meleeAttacks = participant.battleData.attacks?.filter(
    (attack) => attack.type === AttackType.MELEE || attack.range === "5 ft"
  ) || [];

  const rangedAttacks = participant.battleData.attacks?.filter(
    (attack) => attack.type === AttackType.RANGED || (attack.range && attack.range !== "5 ft")
  ) || [];

  const availableAttacks = selectedType === AttackType.MELEE ? meleeAttacks : selectedType === AttackType.RANGED ? rangedAttacks : [];

  const handleSelectAttack = (attack: BattleAttack) => {
    if (selectedType) {
      onSelect(selectedType, attack);
      onOpenChange(false);
      setSelectedType(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>⚔️ Оберіть Атаку</DialogTitle>
          <DialogDescription>
            Виберіть тип атаки та зброю
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {!selectedType ? (
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant={meleeAttacks.length > 0 ? "default" : "outline"}
                disabled={meleeAttacks.length === 0}
                onClick={() => setSelectedType(AttackType.MELEE)}
                className="h-24 flex flex-col items-center justify-center gap-2"
              >
                <Sword className="w-8 h-8" />
                <span>Атака Ближня</span>
                {meleeAttacks.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {meleeAttacks.length} доступно
                  </span>
                )}
              </Button>

              <Button
                variant={rangedAttacks.length > 0 ? "default" : "outline"}
                disabled={rangedAttacks.length === 0}
                onClick={() => setSelectedType(AttackType.RANGED)}
                className="h-24 flex flex-col items-center justify-center gap-2"
              >
                <Crosshair className="w-8 h-8" />
                <span>Атака Дальня</span>
                {rangedAttacks.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {rangedAttacks.length} доступно
                  </span>
                )}
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedType(null)}
                  className="w-full"
                >
                  ← Назад
                </Button>
                <h3 className="font-semibold">
                  {selectedType === AttackType.MELEE ? "Ближня зброя" : "Дальня зброя"}
                </h3>
                <div className="space-y-2">
                  {availableAttacks.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Немає доступної зброї цього типу
                    </p>
                  ) : (
                    availableAttacks.map((attack) => (
                      <Button
                        key={attack.id || attack.name}
                        variant="outline"
                        onClick={() => handleSelectAttack(attack)}
                        className="w-full justify-start"
                      >
                        <div className="flex flex-col items-start">
                          <span className="font-semibold">{attack.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {attack.damageDice} {attack.damageType}
                            {attack.range && ` • ${attack.range}`}
                          </span>
                        </div>
                      </Button>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
