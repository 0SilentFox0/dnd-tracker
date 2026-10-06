"use client";

import { ParticipantRow } from "./ParticipantRow";

import { useBattleScene } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import { getEffectiveArmorClass } from "@/lib/utils/battle/participant/helpers";
import { canSeeExactStats, formatKnownArmorClass, knownArmorClass } from "@/lib/utils/battle/view";

export function ParticipantList({ side, className }: { side: "ally" | "enemy"; className?: string }) {
  const { allies, enemies, battle, viewer, current, select } = useBattleScene();

  const list = side === "ally" ? allies : enemies;

  const order = battle.initiativeOrder;

  return (
    <div className={cn("px-4", className)}>
      {list.map((p) => {
        const exact = canSeeExactStats(p, viewer);

        const acText = exact ? String(getEffectiveArmorClass(p, order)) : formatKnownArmorClass(knownArmorClass(battle.battleLog ?? [], p.basicInfo.id));

        return <ParticipantRow key={p.basicInfo.id} participant={p} exact={exact} acText={acText} current={current?.basicInfo.id === p.basicInfo.id} onSelect={select} />;
      })}
    </div>
  );
}
