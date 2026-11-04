import { critOutcome } from "./crit-outcome";
import { type BattleKnowledge, formatKnownArmorClass, resolveKnownArmorClass } from "./knowledge";
import { retaliationOutcome } from "./retaliation";
import { volleyResults } from "./volley-results";

import type { AttackOutcomeSummary } from "@/lib/utils/battle/flows";
import type { PercentileAttackDetails } from "@/lib/utils/battle/types/attack";
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

  return strikes.map((s) => ({ kind: s.outcome === "crit" || s.outcome === "hit" ? s.outcome : "miss", targetId: s.targetId, damage: 0, downed: false }));
}

interface AttackResultFxInput {
  results: AttackOutcomeSummary[];
  log: BattleAction[];
  seen: ReadonlySet<number>;
  attackerId: string;
  d20: number;
  weapon?: string;
  nameOf(participantId: string): string;
  /** Whether the viewer may see the target's exact defense (defender roll, SL). */
  exactOf?(participantId: string): boolean;
  knowledge?: BattleKnowledge;
}

function percentileOf(log: BattleAction[], seen: ReadonlySet<number>, attackerId: string, targetId: string, exact: boolean): PercentileAttackDetails | undefined {
  const p = log.find((x) => !seen.has(x.actionIndex) && x.actionType === "attack" && x.actorId === attackerId && x.targets[0]?.participantId === targetId && x.actionDetails.percentile)?.actionDetails.percentile;

  if (!p || exact) return p;

  const { defender: _defender, ...rest } = p;

  return { ...rest, sl: p.netSl };
}

export function buildAttackResultFx({ results, log, seen, attackerId, d20, weapon, nameOf, exactOf = () => false, knowledge }: AttackResultFxInput): ResultFx {
  const first = results[0];

  const retaliation = retaliationOutcome(log, seen);

  const crit = critOutcome(log, seen, attackerId, first.targetId);

  const targetName = nameOf(first.targetId);

  const percentile = percentileOf(log, seen, attackerId, first.targetId, exactOf(first.targetId));

  const strikes: StrikeFx[] | undefined = results.length > 1 ? results.map((r) => ({ targetName: nameOf(r.targetId), kind: r.kind, damage: r.damage, downed: r.downed, splash: r.splash })) : undefined;

  if (first.kind === "miss" || crit?.type === "fail") {
    return {
      kind: "miss",
      targetName,
      d20,
      known: formatKnownArmorClass(resolveKnownArmorClass(log, first.targetId, knowledge)),
      ...(percentile && { percentile }),
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
    ...(percentile && { percentile }),
    ...(strikes && { strikes }),
    ...(retaliation && { retaliation }),
    ...(crit?.type === "success" && { critEffect: crit }),
  };
}
