"use client";

import { memo } from "react";
import { EyeOff } from "lucide-react";

import { Portrait } from "@/components/battle/hud";
import { useBattleScene } from "@/lib/hooks/battle";
import type { BattleParticipant } from "@/types/battle";

export const ReserveParticipantRow = memo(function ReserveParticipantRow({ participant }: { participant: BattleParticipant }) {
  const { actions } = useBattleScene();

  const { name, id } = participant.basicInfo;

  return (
    <div className="flex min-h-[76px] w-full items-center gap-3 border-b border-dashed border-white/[.08] py-2 opacity-50">
      <Portrait participant={participant} size={48} current={false} className="pointer-events-none" />
      <span className="hud-sc min-w-0 flex-1 truncate text-base font-bold text-[var(--ink)]">{name}</span>
      <button
        type="button"
        aria-label={`Ввести в бій: ${name}`}
        title="Ввести в бій — ходить одразу після поточного ходу"
        disabled={actions.reveal.isPending}
        onClick={() => actions.reveal.mutate({ participantIds: [id] })}
        className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/20 text-[var(--ink)] hover:bg-white/10 disabled:opacity-50"
      >
        <EyeOff className="size-5" />
      </button>
    </div>
  );
});
