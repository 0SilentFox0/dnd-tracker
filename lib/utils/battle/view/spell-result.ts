import type { SystemSlot } from "@/lib/utils/rules/systems/slot";
import type { BattleAction } from "@/types/battle";
import type { ResultFx } from "@/types/battle-scene";

type HpChange = { participantId: string; participantName: string; change: number };

/** Сумарна зміна HP на учасника: шкода > 0, лікування < 0. */
export function hpTotals(changes: HpChange[]): { name: string; change: number }[] {
  const byId = new Map<string, { name: string; change: number }>();

  for (const c of changes) {
    const kept = byId.get(c.participantId);

    byId.set(c.participantId, { name: c.participantName, change: (kept?.change ?? 0) + c.change });
  }

  return [...byId.values()].filter((c) => c.change !== 0);
}

export function buildSpellResultFx(spellName: string, changes: HpChange[], targetCount: number, system?: SystemSlot): ResultFx {
  return { kind: "spell", spellName, changes: hpTotals(changes), targetCount, ...(system && { system }) };
}

/** Casting test of the caster's new log entry, when the system rolled one. */
export function castDetailsOf(log: BattleAction[], seen: Set<number>, actorId: string): SystemSlot | undefined {
  return log.findLast((e) => !seen.has(e.actionIndex) && e.actorId === actorId && e.actionType === "spell" && e.actionDetails?.system)?.actionDetails?.system;
}
