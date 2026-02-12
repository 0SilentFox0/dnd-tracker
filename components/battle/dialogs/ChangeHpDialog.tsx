"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { BattleParticipant } from "@/types/battle";

interface ChangeHpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participant: BattleParticipant | null;
  onConfirm: (participantId: string, newHp: number) => void;
  isPending?: boolean;
}

export function ChangeHpDialog({
  open,
  onOpenChange,
  participant,
  onConfirm,
  isPending,
}: ChangeHpDialogProps) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (participant && open) {
      setValue(String(participant.combatStats.currentHp));
    }
  }, [participant, open]);

  const handleSubmit = () => {
    if (!participant) return;

    const num = parseInt(value, 10);

    if (Number.isNaN(num) || num < 0) return;

    onConfirm(participant.basicInfo.id, Math.min(num, participant.combatStats.maxHp));
    onOpenChange(false);
  };

  if (!participant) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle>Змінити HP</DialogTitle>
          <DialogDescription className="text-slate-300">
            {participant.basicInfo.name} — поточний HP:{" "}
            {participant.combatStats.currentHp} /{" "}
            {participant.combatStats.maxHp}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Нове значення HP (0 … {participant.combatStats.maxHp})</Label>
            <input
              type="number"
              min={0}
              max={participant.combatStats.maxHp}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="flex h-9 w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-1 text-sm text-white"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-600 text-slate-300"
          >
            Скасувати
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isPending ||
              value === "" ||
              Number.isNaN(parseInt(value, 10))
            }
          >
            {isPending ? "Зберігаємо…" : "Зберегти"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
