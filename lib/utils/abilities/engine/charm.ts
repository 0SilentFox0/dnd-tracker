import type { BattleParticipant } from "@/types/battle";

export function restoreCharm(p: BattleParticipant): BattleParticipant {
  const live = p.battleData.activeEffects.find((e) => e.charmOrigin);

  const origin = p.battleData.charmReturn ?? live?.charmOrigin;

  if (!origin) return p;

  const { charmReturn: _returned, ...battleData } = p.battleData;

  return {
    ...p,
    basicInfo: { ...p.basicInfo, side: origin.side, controlledBy: origin.controlledBy },
    battleData: { ...battleData, activeEffects: battleData.activeEffects.filter((e) => !e.charmOrigin) },
  };
}
