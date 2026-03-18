"use client";

import { useState } from "react";

import {
  BattleDialog,
  BattleDialogFooter,
} from "@/components/battle/dialogs/shared";
import { Button } from "@/components/ui/button";
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

  if (!participant) return null;

  const description = getMoraleCheckDescription(participant);

  const currentMorale = participant.combatStats.morale;

  const moraleValue = Math.abs(currentMorale);

  const chance = moraleValue * 10;

  const minRoll = Math.ceil(11 - chance / 10);

  const handleConfirm = () => {
    const roll = parseInt(d10Roll, 10);

    if (roll >= 1 && roll <= 10) {
      onConfirm(roll);
      setD10Roll("");
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    setD10Roll("");
    onOpenChange(false);
  };

  const valid = d10Roll !== "" && parseInt(d10Roll, 10) >= 1 && parseInt(d10Roll, 10) <= 10;

  return (
    <BattleDialog
      open={open}
      onOpenChange={onOpenChange}
      title="🎲 Перевірка Моралі"
      description={participant.basicInfo.name}
    >
      <div className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground mb-2">{description}</p>
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
            min={1}
            max={10}
            value={d10Roll}
            onChange={(e) => setD10Roll(e.target.value)}
            placeholder="Введіть результат (1-10)"
          />
        </div>
        <BattleDialogFooter>
          <Button variant="outline" onClick={handleCancel} className="flex-1">
            Скасувати
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!valid}
            className="flex-1"
          >
            Підтвердити
          </Button>
        </BattleDialogFooter>
      </div>
    </BattleDialog>
  );
}
