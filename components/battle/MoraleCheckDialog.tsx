"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { BattleParticipant } from "@/types/battle";
import { getMoraleCheckDescription } from "@/lib/utils/battle-morale";

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
  const currentMorale = participant.morale;
  const moraleValue = Math.abs(currentMorale);
  const chance = moraleValue * 10;

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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>🎲 Перевірка Моралі</DialogTitle>
          <DialogDescription>
            {participant.name}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              {description}
            </p>
            {currentMorale > 0 && (
              <p className="text-sm">
                Якщо кидок ≤ {chance}, {participant.name} отримає додатковий хід!
              </p>
            )}
            {currentMorale < 0 && (
              <p className="text-sm">
                Якщо кидок ≤ {chance}, {participant.name} пропустить хід.
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
              className="flex-1"
            >
              Підтвердити
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setD10Roll("");
                onOpenChange(false);
              }}
            >
              Скасувати
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
