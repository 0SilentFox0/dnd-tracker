import { findParticipant, isActive, replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import type { Downed } from "@/lib/utils/abilities/engine/core/types";
import { applyRawDamage } from "@/lib/utils/abilities/engine/effects/hp";
import { applyDamageConsequences } from "@/lib/utils/battle/damage/consequences";
import { applyResistance } from "@/lib/utils/battle/resistance";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

export interface ResistedHit {
  targetId: string;
  amount: number;
}

export interface ResistedHitsResult {
  participants: BattleParticipant[];
  results: { targetId: string; dealt: number }[];
  downed: Downed[];
  messages: LogLine[];
}

export interface ResistedDamageOptions {
  rules?: Ruleset;
  rng?: () => number;
}

export function dealResistedDamage(
  ps: BattleParticipant[],
  targetId: string,
  amount: number,
  damageType: string,
  opts: ResistedDamageOptions = {},
): { participants: BattleParticipant[]; dealt: number; downed: boolean; messages: LogLine[] } | null {
  const target = findParticipant(ps, targetId);

  if (!target) return null;

  const { finalDamage } = applyResistance(target, amount, damageType);

  const hurt = finalDamage > 0 ? applyRawDamage(target, finalDamage) : target;

  const after = replaceParticipant(ps, hurt);

  const c = applyDamageConsequences({ before: target, after: hurt, amount: finalDamage, rules: opts.rules, rng: opts.rng ?? Math.random, participants: after });

  return { participants: c.participants, dealt: finalDamage, downed: isActive(target) && !isActive(c.participant), messages: c.messages };
}

export function dealResistedHits(ps: BattleParticipant[], hits: ResistedHit[], opts: { actorId: string; damageType: string } & ResistedDamageOptions): ResistedHitsResult {
  return hits.reduce<ResistedHitsResult>(
    (acc, { targetId, amount }) => {
      const r = dealResistedDamage(acc.participants, targetId, amount, opts.damageType, opts);

      if (!r) return acc;

      return {
        participants: r.participants,
        results: [...acc.results, { targetId, dealt: r.dealt }],
        downed: r.downed ? [...acc.downed, { victimId: targetId, actorId: opts.actorId }] : acc.downed,
        messages: [...acc.messages, ...r.messages],
      };
    },
    { participants: ps, results: [], downed: [], messages: [] },
  );
}
