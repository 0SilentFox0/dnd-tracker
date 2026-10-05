import type { BattleParticipant } from "@/types/battle";

export function isExtraTurnSlot(p: BattleParticipant): boolean {
  return p.basicInfo.isExtraTurnSlot === true;
}

function copyDynamicState(from: BattleParticipant, to: BattleParticipant): BattleParticipant {
  return {
    ...to,
    combatStats: { ...from.combatStats },
    spellcasting: { ...to.spellcasting, spellSlots: from.spellcasting.spellSlots },
    battleData: {
      ...to.battleData,
      activeEffects: from.battleData.activeEffects,
      skillUsageCounts: from.battleData.skillUsageCounts,
      pendingExtraActions: from.battleData.pendingExtraActions,
    },
  };
}

function originalIndex(order: BattleParticipant[], slot: BattleParticipant): number {
  return order.findIndex((p) => p.basicInfo.id === slot.basicInfo.extraTurnOf);
}

export function syncSlotFromOriginal(order: BattleParticipant[], slotIndex: number): BattleParticipant[] {
  const slot = order[slotIndex];

  const idx = slot && isExtraTurnSlot(slot) ? originalIndex(order, slot) : -1;

  if (idx < 0) return order;

  return order.map((p, i) => (i === slotIndex ? copyDynamicState(order[idx], slot) : p));
}

export function syncOriginalFromSlot(order: BattleParticipant[], slotIndex: number): BattleParticipant[] {
  const slot = order[slotIndex];

  const idx = slot && isExtraTurnSlot(slot) ? originalIndex(order, slot) : -1;

  if (idx < 0) return order;

  return order.map((p, i) => (i === idx ? copyDynamicState(slot, p) : p));
}

export function resolveTargetId(order: BattleParticipant[], id: string): string {
  const target = order.find((p) => p.basicInfo.id === id);

  return target && isExtraTurnSlot(target) && target.basicInfo.extraTurnOf ? target.basicInfo.extraTurnOf : id;
}
