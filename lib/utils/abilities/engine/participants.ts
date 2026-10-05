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

export function isUp(p: BattleParticipant): boolean {
  return p.combatStats.status === "active";
}

export function resolvedAbilitiesOf(p: BattleParticipant): ResolvedAbility[] {
  return p.battleData.resolvedAbilities ?? [];
}

export function participantNames(ps: BattleParticipant[], ids: string[]): string {
  return ids.map((id) => findParticipant(ps, id)?.basicInfo.name ?? id).join(", ");
}
