"use client";

import { memo, useMemo } from "react";

import { ParticipantRow } from "./ParticipantRow";

import { ParticipantSide } from "@/lib/constants/battle";
import { useBattleSceneData } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import { getEffectiveArmorClass } from "@/lib/utils/battle/participant/helpers";
import { canSeeExactStats, formatKnownArmorClass, resolveKnownArmorClass } from "@/lib/utils/battle/view";

export const ParticipantList = memo(function ParticipantList({ side, className }: { side: ParticipantSide; className?: string }) {
  const { allies, enemies, battle, viewer, current, select } = useBattleSceneData();

  const list = side === ParticipantSide.ALLY ? allies : enemies;

  const { initiativeOrder: order, battleLog, knowledge } = battle;

  const rows = useMemo(
    () =>
      list.map((p) => {
        const exact = canSeeExactStats(p, viewer);

        const acText = exact ? String(getEffectiveArmorClass(p, order)) : formatKnownArmorClass(resolveKnownArmorClass(battleLog ?? [], p.basicInfo.id, knowledge));

        return { participant: p, exact, acText };
      }),
    [list, viewer, order, battleLog, knowledge],
  );

  return (
    <div className={cn("px-4", className)}>
      {rows.map(({ participant, exact, acText }) => (
        <ParticipantRow key={participant.basicInfo.id} participant={participant} exact={exact} acText={acText} current={current?.basicInfo.id === participant.basicInfo.id} onSelect={select} />
      ))}
    </div>
  );
});
