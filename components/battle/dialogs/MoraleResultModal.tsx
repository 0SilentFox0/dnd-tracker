"use client";

import {
  BattleDialog,
  BattleDialogFooter,
} from "@/components/battle/dialogs/shared";
import { Button } from "@/components/ui/button";
import type { MoraleCheckResult } from "@/lib/utils/battle/battle-morale";

interface MoraleResultModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: MoraleCheckResult | null;
  participantName?: string;
}

export function MoraleResultModal({
  open,
  onOpenChange,
  result,
  participantName,
}: MoraleResultModalProps) {
  if (!result) return null;

  // Для позитивної моралі: успіх = hasExtraTurn
  // Для негативної моралі: успіх = !shouldSkipTurn (не пропустив хід)
  const success = result.hasExtraTurn || !result.shouldSkipTurn;

  const failMessage =
    "Герой бачить що ворог надто сильний і втрачає віру у себе. Хід пропускається.";

  return (
    <BattleDialog
      open={open}
      onOpenChange={onOpenChange}
      title={success ? "⭐ Успіх" : "😔 Невдача"}
      description={participantName}
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {success ? result.message : failMessage}
        </p>
        <BattleDialogFooter>
          <Button onClick={() => onOpenChange(false)} className="flex-1">
            OK
          </Button>
        </BattleDialogFooter>
      </div>
    </BattleDialog>
  );
}
