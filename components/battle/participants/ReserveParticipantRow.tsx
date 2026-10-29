"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import { EyeOff, X } from "lucide-react";

import { Portrait } from "@/components/battle/hud";
import { useBattleScene } from "@/lib/hooks/battle";
import { useConfirm } from "@/lib/hooks/common";
import type { BattleParticipant } from "@/types/battle";

export const ReserveParticipantRow = memo(function ReserveParticipantRow({ participant }: { participant: BattleParticipant }) {
  const t = useTranslations("battle.reserve");

  const tc = useTranslations("common.actions");

  const { actions } = useBattleScene();

  const confirm = useConfirm();

  const { name, id } = participant.basicInfo;

  const remove = async () => {
    if (await confirm({ title: t("removeConfirm", { name }), confirmLabel: tc("delete"), destructive: true })) {
      actions.updateParticipant.mutate({ participantId: id, data: { removeFromBattle: true } });
    }
  };

  return (
    <div className="flex min-h-[76px] w-full items-center gap-3 border-b border-dashed border-white/[.08] py-2 opacity-50">
      <Portrait participant={participant} size={48} current={false} className="pointer-events-none" />
      <span className="hud-sc min-w-0 flex-1 truncate text-base font-bold text-[var(--ink)]">{name}</span>
      <button
        type="button"
        aria-label={t("reveal", { name })}
        title={t("revealHint")}
        disabled={actions.reveal.isPending}
        onClick={() => actions.reveal.mutate({ participantIds: [id] })}
        className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/20 text-[var(--ink)] hover:bg-white/10 disabled:opacity-50"
      >
        <EyeOff className="size-5" />
      </button>
      <button
        type="button"
        aria-label={t("remove", { name })}
        disabled={actions.updateParticipant.isPending}
        onClick={() => void remove()}
        className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/20 text-[var(--ink)] hover:bg-white/10 disabled:opacity-50"
      >
        <X className="size-5" />
      </button>
    </div>
  );
});
