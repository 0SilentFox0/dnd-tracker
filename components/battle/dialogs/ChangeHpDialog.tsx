"use client";

import { useState } from "react";

import {
  BattleDialog,
  ConfirmCancelFooter,
} from "@/components/battle/dialogs/shared";
import { Label } from "@/components/ui/label";
import type { BattleParticipant } from "@/types/battle";

interface ChangeHpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participant: BattleParticipant | null;
  onConfirm: (participantId: string, newHp: number) => void;
  isPending?: boolean;
}

function ChangeHpFormInner({
  participant,
  onConfirm,
  onOpenChange,
  isPending,
}: {
  participant: BattleParticipant;
  onConfirm: (participantId: string, newHp: number) => void;
  onOpenChange: (open: boolean) => void;
  isPending?: boolean;
}) {
  const [value, setValue] = useState(() =>
    String(participant.combatStats.currentHp),
  );

  const maxHp = participant.combatStats.maxHp;

  const numValue = parseInt(value, 10);

  const isValid = value !== "" && !Number.isNaN(numValue);

  const handleSubmit = () => {
    const num = parseInt(value, 10);

    if (Number.isNaN(num) || num < 0) return;

    onConfirm(
      participant.basicInfo.id,
      Math.min(num, participant.combatStats.maxHp),
    );
    onOpenChange(false);
  };

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <Label className="text-slate-200">
          Нове значення HP (0 … {maxHp})
        </Label>
        <input
          type="number"
          min={0}
          max={maxHp}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex h-9 w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-1 text-sm text-white"
        />
      </div>
      <ConfirmCancelFooter
        onCancel={() => onOpenChange(false)}
        confirmLabel="Зберегти"
        onConfirm={handleSubmit}
        confirmDisabled={!isValid}
        confirmLoading={isPending}
        confirmLoadingLabel="Зберігаємо…"
      />
    </div>
  );
}

export function ChangeHpDialog({
  open,
  onOpenChange,
  participant,
  onConfirm,
  isPending,
}: ChangeHpDialogProps) {
  if (!participant) return null;

  return (
    <BattleDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Змінити HP"
      description={
        <>
          {participant.basicInfo.name} — поточний HP:{" "}
          {participant.combatStats.currentHp} / {participant.combatStats.maxHp}
        </>
      }
      contentClassName="bg-slate-900 border-slate-700 text-white"
    >
      <ChangeHpFormInner
        key={participant.basicInfo.id}
        participant={participant}
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
        isPending={isPending}
      />
    </BattleDialog>
  );
}
