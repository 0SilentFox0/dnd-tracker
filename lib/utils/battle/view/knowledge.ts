import { BattleActionType } from "@/lib/constants/battle";
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

const AC_EVENT_TYPES: readonly string[] = [BattleActionType.ATTACK, BattleActionType.RETALIATION];

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
    .filter((e) => AC_EVENT_TYPES.includes(e.actionType) && targets(e, targetId))
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

export interface EnemyKnowledge {
  ac: KnownArmorClass;
  traits: ObservedTrait[];
}

export type BattleKnowledge = Record<string, EnemyKnowledge>;

// кроки шкоди (риси цілі) пишуть і заклинання, AC — лише атаки
export const KNOWLEDGE_EVENT_TYPES = [...AC_EVENT_TYPES, BattleActionType.SPELL];

const KNOWLEDGE_EVIDENCE_LIMIT = 5;

export function mergeKnownArmorClass(a: KnownArmorClass | undefined, b: KnownArmorClass): KnownArmorClass {
  if (!a) return b;

  const min = a.min === undefined || b.min === undefined ? (a.min ?? b.min) : Math.max(a.min, b.min);

  const max = a.max === undefined || b.max === undefined ? (a.max ?? b.max) : Math.min(a.max, b.max);

  if (min !== undefined && max !== undefined && min > max) return b;

  const key = (e: KnownArmorClass["evidence"][number]) => `${e.actorName}|${e.total}|${e.hit}|${e.round}`;

  const seen = new Set(b.evidence.map(key));

  return { min, max, evidence: [...a.evidence.filter((e) => !seen.has(key(e))), ...b.evidence] };
}

export function mergeObservedTraits(a: ObservedTrait[] | undefined, b: ObservedTrait[]): ObservedTrait[] {
  if (!a?.length) return b;

  const labels = new Set(a.map((t) => t.label));

  return [...a, ...b.filter((t) => !labels.has(t.label))];
}

export function resolveKnownArmorClass(log: BattleAction[], targetId: string, knowledge?: BattleKnowledge): KnownArmorClass {
  return mergeKnownArmorClass(knowledge?.[targetId]?.ac, knownArmorClass(log, targetId));
}

export function resolveObservedTraits(log: BattleAction[], targetId: string, knowledge?: BattleKnowledge): ObservedTrait[] {
  return mergeObservedTraits(knowledge?.[targetId]?.traits, observedTraits(log, targetId));
}

export function summarizeKnowledge(log: BattleAction[]): BattleKnowledge {
  const ids = new Set(log.flatMap((e) => e.targets?.map((t) => t.participantId) ?? []));

  const summary: BattleKnowledge = {};

  for (const id of ids) {
    const ac = knownArmorClass(log, id);

    const traits = observedTraits(log, id);

    if (ac.min === undefined && ac.max === undefined && traits.length === 0) continue;

    summary[id] = { ac: { ...ac, evidence: ac.evidence.slice(-KNOWLEDGE_EVIDENCE_LIMIT) }, traits };
  }

  return summary;
}
