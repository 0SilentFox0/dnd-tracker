import { findParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { effectName } from "@/lib/utils/battle/common/terms";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

export interface AppliedEffect {
  id: string;
  name: LogLine;
  duration: number;
  type: ActiveEffect["type"];
  targetId: string;
}

const effectsOf = (list: BattleParticipant[], id: string) => findParticipant(list, id)?.battleData.activeEffects ?? [];

export function diffAppliedEffects(before: BattleParticipant[], after: BattleParticipant[], targetIds: string[]): AppliedEffect[] {
  return targetIds.flatMap((targetId) => {
    const old = new Set(effectsOf(before, targetId).map((e) => e.id));

    return effectsOf(after, targetId)
      .filter((e) => !old.has(e.id))
      .map((e) => ({ id: e.id, name: effectName(e), duration: e.duration, type: e.type, targetId }));
  });
}
