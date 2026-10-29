import { CombatStatus } from "@/lib/constants/battle";
import type { ResolvedAbility } from "@/types/abilities";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

export function findParticipant(ps: BattleParticipant[], id: string): BattleParticipant | undefined {
  return ps.find((p) => p.basicInfo.id === id);
}

export function replaceParticipant(ps: BattleParticipant[], updated: BattleParticipant): BattleParticipant[] {
  return ps.map((p) => (p.basicInfo.id === updated.basicInfo.id ? updated : p));
}

export function updateParticipant(
  ps: BattleParticipant[],
  id: string,
  fn: (p: BattleParticipant) => BattleParticipant,
): BattleParticipant[] {
  return ps.map((p) => (p.basicInfo.id === id ? fn(p) : p));
}

export function withActiveEffects(p: BattleParticipant, fn: (list: ActiveEffect[]) => ActiveEffect[]): BattleParticipant {
  return { ...p, battleData: { ...p.battleData, activeEffects: fn(p.battleData.activeEffects) } };
}

export function mergeParticipants(ps: BattleParticipant[], updated: BattleParticipant[]): BattleParticipant[] {
  const byId = new Map(updated.map((p) => [p.basicInfo.id, p]));

  return ps.map((p) => byId.get(p.basicInfo.id) ?? p);
}

export function isActive(p: BattleParticipant): boolean {
  return p.combatStats.status === CombatStatus.ACTIVE;
}

export const isAirborne = (p: BattleParticipant): boolean => !!p.battleData.airborne;

// сплячий і вибулий не діють і не зачіпаються масовими вміннями; ставить лише режим карти
export const isDormant = (p: BattleParticipant): boolean => !!p.battleData.dormant;

export const isEscaped = (p: BattleParticipant): boolean => !!p.battleData.escaped;

export const inPlay = (p: BattleParticipant): boolean => isActive(p) && !isDormant(p) && !isEscaped(p);

export const isObject = (p: BattleParticipant): boolean => !!p.battleData.object;

export const sitsOutTurn = (p: BattleParticipant, round: number): boolean => isDormant(p) || isEscaped(p) || isObject(p) || (p.battleData.mazeWakeRound ?? 0) > round;

export const takesTurn = (p: BattleParticipant, round: number): boolean => isActive(p) && !sitsOutTurn(p, round);

/** Хто стоїть на ходу, коли ніхто не ходить: перший у грі, інакше перший живий, інакше 0. */
export function idleTurnIndex(order: BattleParticipant[]): number {
  const firstInPlay = order.findIndex(inPlay);

  return firstInPlay >= 0 ? firstInPlay : Math.max(0, order.findIndex(isActive));
}

export function isTargetable(p: BattleParticipant): boolean {
  return isActive(p) && !isAirborne(p) && !isEscaped(p) && !isObject(p);
}

export const isDying = (p: BattleParticipant): boolean => p.combatStats.status === CombatStatus.UNCONSCIOUS && !!p.battleData.deathSaves;

/** Ціль атаки: як isTargetable, але героя, що вмирає за 5e, теж можна бити (кожне влучання — провал кидка смерті). */
export const isAttackable = (p: BattleParticipant): boolean => (isActive(p) || isDying(p)) && !isAirborne(p) && !isEscaped(p) && !isObject(p);

export function resolvedAbilitiesOf(p: BattleParticipant): ResolvedAbility[] {
  return p.battleData.resolvedAbilities ?? [];
}

export function participantNames(ps: BattleParticipant[], ids: string[]): string {
  return ids.map((id) => findParticipant(ps, id)?.basicInfo.name ?? id).join(", ");
}

// Гарантує, що в списку саме свіжа версія p (читачі часто отримують оновлений об'єкт окремо від списку).
export function withSelf(ps: BattleParticipant[], p: BattleParticipant): BattleParticipant[] {
  return [p, ...ps.filter((x) => x.basicInfo.id !== p.basicInfo.id)];
}
