"use client";

import { type FormEvent, useState } from "react";
import { useTranslations } from "next-intl";

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

/** The parent closes it in the mutation onSuccess: until then "Saving…" shows and an error keeps the input. */
export function ChangeHpDialog({ participant, ...rest }: ChangeHpDialogProps) {
  if (!participant) return null;

  return <ChangeHpDialogBody key={participant.basicInfo.id} participant={participant} {...rest} />;
}

function ChangeHpDialogBody({ participant, onClose, onConfirm, isPending }: ChangeHpDialogProps & { participant: BattleParticipant }) {
  const t = useTranslations("battleDm.changeHp");

  const tActions = useTranslations("common.actions");

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
      title={t("title")}
      description={t("description", { name: participant.basicInfo.name, current: currentHp, max: maxHp })}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>{tActions("cancel")}</Button>
          <Button type="submit" form={FORM_ID} disabled={!isValid || isPending}>{isPending ? t("saving") : tActions("save")}</Button>
        </>
      }
    >
      {/* noValidate: a value above max is clamped, not blocked by the browser */}
      <form id={FORM_ID} noValidate onSubmit={submit} className="space-y-2 py-2">
        <Label htmlFor="change-hp-value">{t("value", { max: maxHp })}</Label>
        <Input id="change-hp-value" type="number" min={0} max={maxHp} value={value} onChange={(e) => setValue(e.target.value)} />
      </form>
    </ResponsiveDialog>
  );
}
