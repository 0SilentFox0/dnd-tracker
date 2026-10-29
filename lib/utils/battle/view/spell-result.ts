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

export function buildSpellResultFx(spellName: string | undefined, changes: HpChange[], targetCount: number): ResultFx {
  return { kind: "spell", spellName: spellName ?? "Заклинання", changes: hpTotals(changes), targetCount };
}
