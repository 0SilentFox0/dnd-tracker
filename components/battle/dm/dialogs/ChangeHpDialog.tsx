"use client";

import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import type { BattleParticipant } from "@/types/battle";

const FORM_ID = "change-hp-form";

interface ChangeHpDialogProps {
  participant: BattleParticipant | null;
  onClose: () => void;
  onConfirm: (participantId: string, newHp: number) => void;
  isPending?: boolean;
}

/** Закриває батько в onSuccess мутації — до того видно «Зберігаємо…», а помилка не губить введене. */
export function ChangeHpDialog({ participant, ...rest }: ChangeHpDialogProps) {
  if (!participant) return null;

  return <ChangeHpDialogBody key={participant.basicInfo.id} participant={participant} {...rest} />;
}

function ChangeHpDialogBody({ participant, onClose, onConfirm, isPending }: ChangeHpDialogProps & { participant: BattleParticipant }) {
  const { currentHp, maxHp } = participant.combatStats;

  const [value, setValue] = useState(() => String(currentHp));

  const num = parseInt(value, 10);

  const isValid = !Number.isNaN(num) && num >= 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();

    if (isValid) onConfirm(participant.basicInfo.id, Math.min(num, maxHp));
  };

  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => !open && onClose()}
      size="md"
      hud
      title="Змінити HP"
      description={<>{participant.basicInfo.name} — поточний HP: {currentHp} / {maxHp}</>}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>Скасувати</Button>
          <Button type="submit" form={FORM_ID} disabled={!isValid || isPending}>{isPending ? "Зберігаємо…" : "Зберегти"}</Button>
        </>
      }
    >
      {/* noValidate: значення понад max обрізається до max, а не блокується браузером */}
      <form id={FORM_ID} noValidate onSubmit={submit} className="space-y-2 py-2">
        <Label htmlFor="change-hp-value">Нове значення HP (0 … {maxHp})</Label>
        <Input id="change-hp-value" type="number" min={0} max={maxHp} value={value} onChange={(e) => setValue(e.target.value)} />
      </form>
    </ResponsiveDialog>
  );
}
