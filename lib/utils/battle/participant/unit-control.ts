import { ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { CONTROLLED_BY_DM } from "@/lib/constants/characters";
import { findParticipant } from "@/lib/utils/abilities/engine/core/participants";
import type { Rng } from "@/lib/utils/abilities/engine/core/types";
import { REJECT } from "@/lib/utils/battle/store/reject";
import { pickOne } from "@/lib/utils/common/dice";
import type { BattleParticipant } from "@/types/battle";

export const controlledByDm = (p: BattleParticipant, dmUserId: string | null) =>
  p.basicInfo.controlledBy === CONTROLLED_BY_DM || (dmUserId !== null && p.basicInfo.controlledBy === dmUserId);

const isRealPlayer = (p: BattleParticipant, dmUserId: string | null) => p.basicInfo.sourceType === ParticipantSourceType.CHARACTER && !controlledByDm(p, dmUserId);

// прикликаний належить тому, хто прикликав; зачарований — тому, хто зачарував
const isSideUnit = (p: BattleParticipant) =>
  p.basicInfo.sourceType === ParticipantSourceType.UNIT && !p.battleData.summonedBy && !p.battleData.activeEffects.some((e) => e.charmOrigin);

export const isAssignableUnit = (p: BattleParticipant) => isSideUnit(p) && p.basicInfo.side === ParticipantSide.ALLY;

export function allyOwners(order: BattleParticipant[], dmUserId: string): string[] {
  return [...new Set(order.filter((p) => p.basicInfo.side === ParticipantSide.ALLY && isRealPlayer(p, dmUserId)).map((p) => p.basicInfo.controlledBy))];
}

export const freeUnits = (order: BattleParticipant[], dmUserId: string | null): BattleParticipant[] => order.filter((p) => isAssignableUnit(p) && controlledByDm(p, dmUserId));

export function ownerHeroNames(order: BattleParticipant[], owner: string): string {
  return order
    .filter((p) => p.basicInfo.sourceType === ParticipantSourceType.CHARACTER && p.basicInfo.side === ParticipantSide.ALLY && p.basicInfo.controlledBy === owner)
    .map((p) => p.basicInfo.name)
    .join(", ");
}

const withController = (p: BattleParticipant, controlledBy: string): BattleParticipant => (p.basicInfo.controlledBy === controlledBy ? p : { ...p, basicInfo: { ...p.basicInfo, controlledBy } });

export type SetControllerResult = { participants: BattleParticipant[]; unit: BattleParticipant } | { error: string };

export function setUnitController(order: BattleParticipant[], unitId: string, controlledBy: string, dmUserId: string): SetControllerResult {
  const target = findParticipant(order, unitId);

  if (!target || !isAssignableUnit(target)) return { error: REJECT.unitNotAssignable };

  const toDm = controlledBy === CONTROLLED_BY_DM || controlledBy === dmUserId;

  if (!toDm && !allyOwners(order, dmUserId).includes(controlledBy)) return { error: REJECT.playerNotInBattle };

  const unit = withController(target, toDm ? CONTROLLED_BY_DM : controlledBy);

  return { participants: order.map((p) => (p === target ? unit : p)), unit };
}

export function randomizeUnitControl(order: BattleParticipant[], dmUserId: string, rng: Rng): { participants: BattleParticipant[]; assigned: { unit: BattleParticipant; owner: string }[] } {
  const owners = allyOwners(order, dmUserId);

  const assigned: { unit: BattleParticipant; owner: string }[] = [];

  if (owners.length === 0) return { participants: order, assigned };

  const participants = order.map((p) => {
    if (!isAssignableUnit(p) || !controlledByDm(p, dmUserId)) return p;

    const unit = withController(p, pickOne(owners, rng));

    if (unit !== p) assigned.push({ unit, owner: unit.basicInfo.controlledBy });

    return unit;
  });

  return { participants, assigned };
}
