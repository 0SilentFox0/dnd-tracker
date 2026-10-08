import { updateParticipant } from "@/lib/utils/abilities/engine/participants";
import { effectKey, withoutEffects } from "@/lib/utils/battle/attack/consume-effects";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

const isCritConsumable = (e: ActiveEffect) => e.id.startsWith("critical-") && !!e.consumeOn;

// Крит-ефекти атакуючого з витратою діють з наступної атаки, тому решту залпу пропускають.
export function holdBackNewEffects(
  order: BattleParticipant[],
  attacker: BattleParticipant,
  existedBefore: Set<string>,
): { order: BattleParticipant[]; attacker: BattleParticipant; held: ActiveEffect[] } {
  const attackerId = attacker.basicInfo.id;

  const held = attacker.battleData.activeEffects.filter((e) => !existedBefore.has(effectKey(attackerId, e.id)) && isCritConsumable(e));

  if (held.length === 0) return { order, attacker, held };

  const heldIds = new Set(held.map((e) => e.id));

  const drop = (e: ActiveEffect) => heldIds.has(e.id);

  return { order: updateParticipant(order, attackerId, (p) => withoutEffects(p, drop)), attacker: withoutEffects(attacker, drop), held };
}

export function restoreHeldBack(order: BattleParticipant[], attackerId: string, held: ActiveEffect[]): BattleParticipant[] {
  if (held.length === 0) return order;

  return updateParticipant(order, attackerId, (p) => ({ ...p, battleData: { ...p.battleData, activeEffects: [...p.battleData.activeEffects, ...held] } }));
}
