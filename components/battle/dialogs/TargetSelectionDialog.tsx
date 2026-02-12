"use client";

import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ParticipantSide } from "@/lib/constants/battle";
import type { BattleParticipant } from "@/types/battle";

interface TargetSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableTargets: BattleParticipant[];
  isAOE?: boolean; // Чи можна вибрати кілька цілей
  maxTargets?: number; // Макс. цілей для AOE (напр. 3)
  onSelect: (targetIds: string[]) => void;
  title?: string;
  description?: string;
}

/**
 * Діалог вибору цілі (одна або кілька для AOE)
 */
export function TargetSelectionDialog({
  open,
  onOpenChange,
  availableTargets,
  isAOE = false,
  maxTargets,
  onSelect,
  title = "🎯 Вибір Цілі",
  description = "Оберіть ціль для атаки",
}: TargetSelectionDialogProps) {
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);

  const handleToggleTarget = (targetId: string) => {
    if (isAOE) {
      setSelectedTargets((prev) => {
        if (prev.includes(targetId)) {
          return prev.filter((id) => id !== targetId);
        }

        const cap = maxTargets ?? 99;

        if (prev.length >= cap) return prev;

        return [...prev, targetId];
      });
    } else {
      // Для звичайної атаки тільки одна ціль
      setSelectedTargets([targetId]);
    }
  };

  const handleConfirm = () => {
    if (selectedTargets.length > 0) {
      onSelect(selectedTargets);
      setSelectedTargets([]);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
            {isAOE && (maxTargets ? ` (макс. ${maxTargets})` : " (можна вибрати кілька)")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {availableTargets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Немає доступних цілей
            </p>
          ) : (
            <>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {availableTargets.map((target) => {
                  const isSelected = selectedTargets.includes(target.basicInfo.id);

                  const hpPercent = (target.combatStats.currentHp / target.combatStats.maxHp) * 100;

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
                            <span className="font-semibold">{target.basicInfo.name}</span>
                            <Badge variant={target.basicInfo.side === ParticipantSide.ALLY ? "default" : "destructive"}>
                              {target.basicInfo.side === ParticipantSide.ALLY ? "Союзник" : "Ворог"}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            HP: {target.combatStats.currentHp}/{target.combatStats.maxHp} ({Math.round(hpPercent)}%)
                            {target.combatStats.status !== "active" && (
                              <span className="ml-2 text-destructive">
                                {target.combatStats.status === "unconscious" ? "Непритомний" : "Мертвий"}
                              </span>
                            )}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="text-lg">✓</div>
                        )}
                      </div>
                    </Button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedTargets([]);
                    onOpenChange(false);
                  }}
                  className="flex-1"
                >
                  Скасувати
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={selectedTargets.length === 0}
                  className="flex-1"
                >
                  Підтвердити ({selectedTargets.length})
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
