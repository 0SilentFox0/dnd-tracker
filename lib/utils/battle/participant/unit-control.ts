import { ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { CONTROLLED_BY_DM } from "@/lib/constants/characters";
import type { Rng } from "@/lib/utils/abilities/engine/core/types";
import { BattleRuleError } from "@/lib/utils/battle/store";
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

export function setUnitController(order: BattleParticipant[], unitId: string, controlledBy: string, dmUserId: string): BattleParticipant[] {
  const target = order.find((p) => p.basicInfo.id === unitId);

  if (!target || !isAssignableUnit(target)) throw new BattleRuleError("invalid_target", "Цим юнітом не можна керувати гравцю");

  const toDm = controlledBy === CONTROLLED_BY_DM || controlledBy === dmUserId;

  if (!toDm && !allyOwners(order, dmUserId).includes(controlledBy)) throw new BattleRuleError("invalid_target", "Гравець не бере участі в бою");

  return order.map((p) => (p === target ? withController(p, toDm ? CONTROLLED_BY_DM : controlledBy) : p));
}

export function randomizeUnitControl(order: BattleParticipant[], dmUserId: string, rng: Rng): BattleParticipant[] {
  const owners = allyOwners(order, dmUserId);

  if (owners.length === 0) return order;

  return order.map((p) => (isAssignableUnit(p) && controlledByDm(p, dmUserId) ? withController(p, owners[Math.floor(rng() * owners.length)]) : p));
}
