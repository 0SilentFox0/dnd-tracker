import { MIN_DAMAGE } from "../combat/constants";
import { applyWfrpConditionTo } from "./apply";
import { BLEEDING_UNCONSCIOUS_CHANCE_PER_LEVEL } from "./catalog";
import { conditionLevel } from "./levels";

import { dynamicTextRef, textRef } from "@/lib/i18n/text-ref";
import { findParticipant, isActive, replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { dropBreakOnDamage } from "@/lib/utils/abilities/engine/effects/hp";
import { rollDie } from "@/lib/utils/common/dice";
import type { Rng } from "@/lib/utils/common/rng";
import type { Ruleset } from "@/lib/utils/rules";
import type { ApplyDamageConsequences, SystemConditionResult } from "@/lib/utils/rules/systems/types";
import type { BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

export function wfrpConditionsTurnStart(ps: BattleParticipant[], id: string, ctx: { round: number; rng: Rng; rules: Ruleset; applyDamage: ApplyDamageConsequences }): SystemConditionResult & { downed: boolean } {
  const start = findParticipant(ps, id);

  if (!start || !isActive(start)) return { participants: ps, messages: [], downed: false };

  let participants = ps;

  const messages: LogLine[] = [];

  const hurt = (amount: number, key: "bleeding" | "ablaze") => {
    const before = findParticipant(participants, id);

    if (!before || !isActive(before) || amount <= 0) return;

    const after = dropBreakOnDamage({ ...before, combatStats: { ...before.combatStats, currentHp: Math.max(0, before.combatStats.currentHp - amount) } }, amount);

    const r = ctx.applyDamage({ before, after, amount, rules: ctx.rules, rng: ctx.rng, participants: replaceParticipant(participants, after), round: ctx.round });

    participants = r.participants;

    messages.push(textRef(`battleWfrp.log.tick.${key}`, { name: before.basicInfo.name, damage: amount }), ...r.messages);
  };

  const bleeding = conditionLevel(start, "bleeding");

  if (bleeding > 0) {
    hurt(bleeding, "bleeding");

    const now = findParticipant(participants, id)!;

    if (isActive(now) && ctx.rng() < BLEEDING_UNCONSCIOUS_CHANCE_PER_LEVEL * bleeding) {
      const faint = applyWfrpConditionTo(now, { key: "unconscious", levels: 1, round: ctx.round, sourceName: dynamicTextRef("battleWfrp.conditions.bleeding.label") });

      participants = replaceParticipant(participants, faint.participant);

      messages.push(textRef("battleWfrp.log.tick.faint", { name: now.basicInfo.name }));
    }
  }

  const ablaze = conditionLevel(findParticipant(participants, id)!, "ablaze");

  if (ablaze > 0) {
    const wfrp = findParticipant(participants, id)!.abilities.wfrp;

    hurt(Math.max(MIN_DAMAGE, rollDie(10, ctx.rng) + ablaze - 1 - (wfrp?.tb ?? 0) - (wfrp?.ap.body ?? 0)), "ablaze");
  }

  const after = findParticipant(participants, id);

  return { participants, messages, downed: !!after && !isActive(after) };
}
