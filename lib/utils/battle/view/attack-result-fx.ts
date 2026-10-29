import { critOutcome } from "./crit-outcome";
import { type BattleKnowledge, formatKnownArmorClass, resolveKnownArmorClass } from "./knowledge";
import { retaliationOutcome } from "./retaliation";
import { volleyResults } from "./volley-results";

import type { AttackOutcomeSummary } from "@/lib/utils/battle/flows";
import type { BattleAction, BattleParticipant } from "@/types/battle";
import type { ResultFx, StrikeFx } from "@/types/battle-scene";

interface StrikeOutcome {
  outcome?: string;
  targetId: string;
}

/** Підсумки залпу з журналу; без записів — припущення за кидками. */
export function attackResultsOf(log: BattleAction[], seen: ReadonlySet<number>, attackerId: string, after: BattleParticipant[], strikes: StrikeOutcome[]): AttackOutcomeSummary[] {
  const fromLog = volleyResults(log, seen, attackerId, after);

  if (fromLog.length > 0) return fromLog;

  return strikes.map((s) => ({ kind: s.outcome === "crit" ? ("crit" as const) : s.outcome === "hit" ? ("hit" as const) : ("miss" as const), targetId: s.targetId, damage: 0, downed: false }));
}

interface AttackResultFxInput {
  results: AttackOutcomeSummary[];
  log: BattleAction[];
  seen: ReadonlySet<number>;
  attackerId: string;
  d20: number;
  weapon?: string;
  nameOf(participantId: string): string;
  knowledge?: BattleKnowledge;
}

export function buildAttackResultFx({ results, log, seen, attackerId, d20, weapon, nameOf, knowledge }: AttackResultFxInput): ResultFx {
  const first = results[0];

  const retaliation = retaliationOutcome(log, seen);

  const crit = critOutcome(log, seen, attackerId, first.targetId);

  const targetName = nameOf(first.targetId);

  const strikes: StrikeFx[] | undefined = results.length > 1 ? results.map((r) => ({ targetName: nameOf(r.targetId), kind: r.kind, damage: r.damage, downed: r.downed, splash: r.splash })) : undefined;

  if (first.kind === "miss" || crit?.type === "fail") {
    return {
      kind: "miss",
      targetName,
      d20,
      known: formatKnownArmorClass(resolveKnownArmorClass(log, first.targetId, knowledge)),
      ...(strikes && { strikes }),
      ...(retaliation && { retaliation }),
      ...(crit?.type === "fail" && { critFail: crit }),
    };
  }

  return {
    kind: first.kind,
    targetName,
    damage: results.reduce((s, r) => s + r.damage, 0),
    downed: first.downed,
    d20,
    weapon,
    ...(strikes && { strikes }),
    ...(retaliation && { retaliation }),
    ...(crit?.type === "success" && { critEffect: crit }),
  };
}
