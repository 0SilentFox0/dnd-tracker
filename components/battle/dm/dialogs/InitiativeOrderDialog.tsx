"use client";

import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useInitiativeOrder } from "@/lib/hooks/battle";
import type { BattleParticipant } from "@/types/battle";

interface InitiativeOrderDialogProps {
  participants: BattleParticipant[] | null;
  onClose: () => void;
  onSubmit: (order: string[]) => void;
  isPending?: boolean;
}

export function InitiativeOrderDialog({ participants, ...rest }: InitiativeOrderDialogProps) {
  if (!participants) return null;

  return <InitiativeOrderBody key={participants.map((p) => p.basicInfo.id).join(",")} participants={participants} {...rest} />;
}

function InitiativeOrderBody({ participants, onClose, onSubmit, isPending }: InitiativeOrderDialogProps & { participants: BattleParticipant[] }) {
  const t = useTranslations("battleDm.initiative");

  const { order, move, isChanged } = useInitiativeOrder(participants.map((p) => p.basicInfo.id));

  const names = new Map(participants.map((p) => [p.basicInfo.id, p.basicInfo.name]));

  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => !open && onClose()}
      size="sm"
      hud
      title={t("title")}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>{t("close")}</Button>
          <Button type="button" disabled={!isChanged || isPending} onClick={() => { onSubmit(order); onClose(); }}>{t("apply")}</Button>
        </>
      }
    >
      <ol className="space-y-1">
        {order.map((id, i) => (
          <li key={id} className="flex items-center gap-2 border border-white/15 bg-black/40 px-2 py-1">
            <span className="hud-sc w-6 text-right text-[13px] text-[var(--hud-muted)]">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate text-[15px]">{names.get(id)}</span>
            <button type="button" className="p-1 text-[var(--gold)] disabled:opacity-30" disabled={i === 0} aria-label={t("up", { name: names.get(id) ?? "" })} onClick={() => move(id, i - 1)}><ChevronUp className="size-4" /></button>
            <button type="button" className="p-1 text-[var(--gold)] disabled:opacity-30" disabled={i === order.length - 1} aria-label={t("down", { name: names.get(id) ?? "" })} onClick={() => move(id, i + 1)}><ChevronDown className="size-4" /></button>
          </li>
        ))}
      </ol>
    </ResponsiveDialog>
  );
}
