import { ParticipantSourceType } from "@/lib/constants/battle";
import { CONTROLLED_BY_DM } from "@/lib/constants/characters";
import type { BattleParticipant } from "@/types/battle";

const isRealPlayer = (p: BattleParticipant, dmUserId: string) =>
  p.basicInfo.sourceType === ParticipantSourceType.CHARACTER && p.basicInfo.controlledBy !== CONTROLLED_BY_DM && p.basicInfo.controlledBy !== dmUserId;

// прикликаний належить тому, хто прикликав; зачарований — тому, хто зачарував
const isSideUnit = (p: BattleParticipant) =>
  p.basicInfo.sourceType === ParticipantSourceType.UNIT && !p.battleData.summonedBy && !p.battleData.activeEffects.some((e) => e.charmOrigin);

/** Юнітами сторони керує її гравець із найвищим рівнем (за рівності — перший у порядку), без гравців — DM. */
export function sideUnitController(order: BattleParticipant[], side: BattleParticipant["basicInfo"]["side"], dmUserId: string): string {
  const players = order.filter((p) => p.basicInfo.side === side && isRealPlayer(p, dmUserId));

  if (players.length === 0) return CONTROLLED_BY_DM;

  return players.reduce((best, p) => (p.abilities.level > best.abilities.level ? p : best)).basicInfo.controlledBy;
}

export function assignUnitControl(order: BattleParticipant[], dmUserId: string): BattleParticipant[] {
  const bySide = new Map<string, string>();

  return order.map((p) => {
    if (!isSideUnit(p)) return p;

    const side = p.basicInfo.side;

    const controlledBy = bySide.get(side) ?? sideUnitController(order, side, dmUserId);

    bySide.set(side, controlledBy);

    return controlledBy === p.basicInfo.controlledBy ? p : { ...p, basicInfo: { ...p.basicInfo, controlledBy } };
  });
}
