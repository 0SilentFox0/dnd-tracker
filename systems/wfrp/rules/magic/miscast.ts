import { applyWfrpConditionTo } from "../conditions/apply";
import { rollSlot, rowText } from "../tables/resolve";

import { textRef } from "@/lib/i18n/text-ref";
import { findParticipant, replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { dropBreakOnDamage } from "@/lib/utils/abilities/engine/effects/hp";
import type { Rng } from "@/lib/utils/common/rng";
import type { Ruleset } from "@/lib/utils/rules";
import type { ApplyDamageConsequences, MiscastKind, SystemConditionResult } from "@/lib/utils/rules/systems/types";
import type { BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

export function wfrpMiscast(
  ps: BattleParticipant[],
  casterId: string,
  kind: MiscastKind,
  ctx: { round: number; rng: Rng; rules: Ruleset; applyDamage: ApplyDamageConsequences; presetRoll?: number },
): SystemConditionResult {
  const caster = findParticipant(ps, casterId);

  if (!caster) return { participants: ps, messages: [] };

  const { row } = rollSlot(ctx.rules, kind === "wrath" ? "wrath" : kind === "major" ? "miscastMajor" : "miscastMinor", ctx.rng, ctx.presetRoll);

  const effect = rowText(row);

  const name = caster.basicInfo.name;

  const messages: LogLine[] = [textRef(kind === "wrath" ? "wfrpMagic.log.wrath" : "wfrpMagic.log.miscast", { name, effect })];

  let participants = ps;

  for (const e of row.effects) {
    if (e.type !== "condition") continue;

    const target = findParticipant(participants, casterId) ?? caster;

    const applied = applyWfrpConditionTo(target, { key: e.key, levels: e.levels, round: ctx.round, sourceName: effect, concealed: true });

    participants = replaceParticipant(participants, applied.participant);

    messages.push(...applied.messages);
  }

  const wounds = row.effects.reduce((sum, e) => (e.type === "wounds" ? sum + e.amount : sum), 0);

  const before = findParticipant(participants, casterId);

  if (wounds > 0 && before) {
    const after = dropBreakOnDamage({ ...before, combatStats: { ...before.combatStats, currentHp: Math.max(0, before.combatStats.currentHp - wounds) } }, wounds);

    const r = ctx.applyDamage({ before, after, amount: wounds, rules: ctx.rules, rng: ctx.rng, participants: replaceParticipant(participants, after), round: ctx.round });

    participants = r.participants;

    messages.push(...r.messages);
  }

  return { participants, messages };
}
