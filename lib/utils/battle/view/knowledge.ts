import type { BattleAction, DamageStep } from "@/types/battle";

export interface KnownArmorClass {
  min?: number;
  max?: number;
  evidence: { actorName: string; total: number; hit: boolean; round: number }[];
}

export interface ObservedTrait {
  label: string;
  kind: DamageStep["kind"];
  value: number;
  icon?: string | null;
}

const targets = (e: BattleAction, id: string) => e.targets?.some((t) => t.participantId === id) ?? false;

function bounds(evidence: KnownArmorClass["evidence"]): Pick<KnownArmorClass, "min" | "max"> {
  let min: number | undefined;

  let max: number | undefined;

  for (const e of evidence) {
    if (e.hit) max = max === undefined ? e.total : Math.min(max, e.total);
    else min = min === undefined ? e.total + 1 : Math.max(min, e.total + 1);
  }

  return { min, max };
}

export function knownArmorClass(log: BattleAction[], targetId: string): KnownArmorClass {
  const evidence = log
    .filter((e) => (e.actionType === "attack" || e.actionType === "retaliation") && targets(e, targetId))
    .filter((e) => typeof e.actionDetails?.totalAttackValue === "number" && typeof e.actionDetails.isHit === "boolean")
    .filter((e) => !e.actionDetails.isCritical && !e.actionDetails.isCriticalFail)
    .map((e) => ({ actorName: e.actorName, total: e.actionDetails.totalAttackValue as number, hit: e.actionDetails.isHit as boolean, round: e.round }));

  const all = bounds(evidence);

  if (all.min === undefined || all.max === undefined || all.min <= all.max) return { ...all, evidence };

  const lastRound = Math.max(...evidence.map((e) => e.round));

  const recent = evidence.filter((e) => e.round === lastRound);

  return { ...bounds(recent), evidence: recent };
}

export function formatKnownArmorClass({ min, max }: KnownArmorClass): string {
  if (min !== undefined && max !== undefined) return min === max ? `${min}` : `${min}–${max}`;

  if (max !== undefined) return `≤ ${max}`;

  if (min !== undefined) return `≥ ${min}`;

  return "?";
}

export function observedTraits(log: BattleAction[], targetId: string): ObservedTrait[] {
  const seen = new Map<string, ObservedTrait>();

  for (const e of log) {
    for (const s of e.actionDetails?.damageSteps?.[targetId] ?? []) {
      if (s.side !== "target" || seen.has(s.label)) continue;

      seen.set(s.label, { label: s.label, kind: s.kind, value: s.value, ...(s.icon && { icon: s.icon }) });
    }
  }

  return [...seen.values()];
}
