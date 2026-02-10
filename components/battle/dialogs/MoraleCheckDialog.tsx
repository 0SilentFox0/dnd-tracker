"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMoraleCheckDescription } from "@/lib/utils/battle/battle-morale";
import type { BattleParticipant } from "@/types/battle";

interface MoraleCheckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participant: BattleParticipant | null;
  onConfirm: (d10Roll: number) => void;
}

export function MoraleCheckDialog({
  open,
  onOpenChange,
  participant,
  onConfirm,
}: MoraleCheckDialogProps) {
  const [d10Roll, setD10Roll] = useState("");

  if (!participant) {
    return null;
  }

  const description = getMoraleCheckDescription(participant);

  const currentMorale = participant.combatStats.morale;

  const moraleValue = Math.abs(currentMorale);

  const chance = moraleValue * 10;

  // Розраховуємо мінімальне значення для успіху
  // Шанс 10% = потрібно >= 10, шанс 20% = потрібно >= 9, тощо
  const minRoll = Math.ceil(11 - (chance / 10));

  const handleConfirm = () => {
    const roll = parseInt(d10Roll);

    if (roll >= 1 && roll <= 10) {
      onConfirm(roll);
      setD10Roll("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto z-[100]">
        <DialogHeader>
          <DialogTitle>🎲 Перевірка Моралі</DialogTitle>
          <DialogDescription>
            {participant.basicInfo.name}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              {description}
            </p>
            {currentMorale > 0 && (
              <p className="text-sm">
                Потрібно викинути ≥ {minRoll} на d10, щоб отримати додатковий хід!
              </p>
            )}
            {currentMorale < 0 && (
              <p className="text-sm">
                Потрібно викинути ≥ {minRoll} на d10, щоб пропустити хід.
              </p>
            )}
          </div>
          <div>
            <Label>Результат кидка 1d10</Label>
            <Input
              type="number"
              min="1"
              max="10"
              value={d10Roll}
              onChange={(e) => setD10Roll(e.target.value)}
              placeholder="Введіть результат (1-10)"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleConfirm}
              disabled={!d10Roll || parseInt(d10Roll) < 1 || parseInt(d10Roll) > 10}
              className="flex-1 min-h-[44px] touch-manipulation"
            >
              Підтвердити
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setD10Roll("");
                onOpenChange(false);
              }}
              className="min-h-[44px] touch-manipulation"
            >
              Скасувати
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
