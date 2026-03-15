"use client";

import { useState } from "react";

import {
  BattleDialog,
  ConfirmCancelFooter,
} from "@/components/battle/dialogs/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ParticipantSide } from "@/lib/constants/battle";
import type { BattleParticipant } from "@/types/battle";

interface TargetSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableTargets: BattleParticipant[];
  isAOE?: boolean;
  maxTargets?: number;
  onSelect: (targetIds: string[]) => void;
  title?: string;
  description?: string;
  canSeeEnemyHp?: boolean;
}

export function TargetSelectionDialog({
  open,
  onOpenChange,
  availableTargets,
  isAOE = false,
  maxTargets,
  onSelect,
  title = "🎯 Вибір Цілі",
  description = "Оберіть ціль для атаки",
  canSeeEnemyHp = false,
}: TargetSelectionDialogProps) {
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);

  const handleToggleTarget = (targetId: string) => {
    if (isAOE) {
      setSelectedTargets((prev) => {
        if (prev.includes(targetId)) return prev.filter((id) => id !== targetId);

        const cap = maxTargets ?? 99;

        if (prev.length >= cap) return prev;

        return [...prev, targetId];
      });
    } else {
      setSelectedTargets([targetId]);
    }
  };

  const handleCancel = () => {
    setSelectedTargets([]);
    onOpenChange(false);
  };

  const handleConfirm = () => {
    if (selectedTargets.length > 0) {
      onSelect(selectedTargets);
      handleCancel();
    }
  };

  const descSuffix = isAOE
    ? maxTargets
      ? ` (макс. ${maxTargets})`
      : " (можна вибрати кілька)"
    : "";

  return (
    <BattleDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={`${description}${descSuffix}`}
    >
      <div className="space-y-4">
        {availableTargets.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Немає доступних цілей
          </p>
        ) : (
          <>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {availableTargets.map((target) => {
                const isSelected = selectedTargets.includes(
                  target.basicInfo.id,
                );

                const hpPercent =
                  (target.combatStats.currentHp /
                    target.combatStats.maxHp) *
                  100;

                return (
                  <Button
                    key={target.basicInfo.id}
                    variant={isSelected ? "default" : "outline"}
                    onClick={() => handleToggleTarget(target.basicInfo.id)}
                    className="w-full justify-start h-auto p-3"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <Avatar className="w-10 h-10">
                        <AvatarImage
                          src={target.basicInfo.avatar || undefined}
                          referrerPolicy="no-referrer"
                        />
                        <AvatarFallback>
                          {target.basicInfo.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            {target.basicInfo.name}
                          </span>
                          <Badge
                            variant={
                              target.basicInfo.side === ParticipantSide.ALLY
                                ? "default"
                                : "destructive"
                            }
                          >
                            {target.basicInfo.side === ParticipantSide.ALLY
                              ? "Союзник"
                              : "Ворог"}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {canSeeEnemyHp ||
                          target.basicInfo.side === ParticipantSide.ALLY ? (
                            <>
                              HP: {target.combatStats.currentHp}/
                              {target.combatStats.maxHp} (
                              {Math.round(hpPercent)}%)
                            </>
                          ) : (
                            "HP: ???"
                          )}
                          {target.combatStats.status !== "active" && (
                            <span className="ml-2 text-destructive">
                              {target.combatStats.status === "unconscious"
                                ? "Непритомний"
                                : "Мертвий"}
                            </span>
                          )}
                        </div>
                      </div>
                      {isSelected && <div className="text-lg">✓</div>}
                    </div>
                  </Button>
                );
              })}
            </div>
            <ConfirmCancelFooter
              onCancel={handleCancel}
              confirmLabel={`Підтвердити (${selectedTargets.length})`}
              onConfirm={handleConfirm}
              confirmDisabled={selectedTargets.length === 0}
            />
          </>
        )}
      </div>
    </BattleDialog>
  );
}
