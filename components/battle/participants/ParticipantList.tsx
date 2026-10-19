"use client";

import { memo, useMemo } from "react";

import { ParticipantRow } from "./ParticipantRow";
import { ReserveParticipantRow } from "./ReserveParticipantRow";

import { ParticipantSide } from "@/lib/constants/battle";
import { useBattleSceneData, useFxImpacts } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import { getEffectiveArmorClass } from "@/lib/utils/battle/participant/helpers";
import { canSeeExactStats, formatKnownArmorClass, NO_EFFECTS, resolveKnownArmorClass } from "@/lib/utils/battle/view";

export const ParticipantList = memo(function ParticipantList({ side, className }: { side: ParticipantSide; className?: string }) {
  const { roster: { allies, enemies, reserve }, battle, viewer, turn: { current }, select, effects } = useBattleSceneData();

  const impactFor = useFxImpacts();

  const list = side === ParticipantSide.ALLY ? allies : enemies;

  const reserved = reserve.filter((p) => p.basicInfo.side === side);

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
        <ParticipantRow key={participant.basicInfo.id} participant={participant} effects={effects.get(participant.basicInfo.id) ?? NO_EFFECTS} exact={exact} acText={acText} current={current?.basicInfo.id === participant.basicInfo.id} impact={impactFor(participant.basicInfo.id)} onSelect={select} />
      ))}
      {reserved.map((p) => (
        <ReserveParticipantRow key={p.basicInfo.id} participant={p} />
      ))}
    </div>
  );
});
