import type { ActiveEffect, BattleParticipant } from "@/types/battle";

export interface AppliedEffect {
  id: string;
  name: string;
  duration: number;
  type: ActiveEffect["type"];
  targetId: string;
}

const effectsOf = (list: BattleParticipant[], id: string) => list.find((p) => p.basicInfo.id === id)?.battleData.activeEffects ?? [];

export function diffAppliedEffects(before: BattleParticipant[], after: BattleParticipant[], targetIds: string[]): AppliedEffect[] {
  return targetIds.flatMap((targetId) => {
    const old = new Set(effectsOf(before, targetId).map((e) => e.id));

    return effectsOf(after, targetId)
      .filter((e) => !old.has(e.id))
      .map((e) => ({ id: e.id, name: e.name, duration: e.duration, type: e.type, targetId }));
  });
}
