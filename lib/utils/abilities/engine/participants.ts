import { CombatStatus } from "@/lib/constants/battle";
import type { ResolvedAbility } from "@/types/abilities";
import type { BattleParticipant } from "@/types/battle";

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

export function mergeParticipants(ps: BattleParticipant[], updated: BattleParticipant[]): BattleParticipant[] {
  const byId = new Map(updated.map((p) => [p.basicInfo.id, p]));

  return ps.map((p) => byId.get(p.basicInfo.id) ?? p);
}

export function isActive(p: BattleParticipant): boolean {
  return p.combatStats.status === CombatStatus.ACTIVE;
}

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
