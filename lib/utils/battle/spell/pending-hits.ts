import { textRef } from "@/lib/i18n/text-ref";
import { findParticipant, isActive, replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { resolveDowned } from "@/lib/utils/abilities/engine/core/run-abilities";
import type { Rng } from "@/lib/utils/abilities/engine/core/types";
import { applyRawDamage } from "@/lib/utils/abilities/engine/effects/hp";
import { applyDamageConsequences } from "@/lib/utils/battle/damage/consequences";
import { applyResistance } from "@/lib/utils/battle/resistance";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

interface PendingCtx {
  round: number;
  rng: Rng;
  rules?: Ruleset;
}

/** Відкладені удари кастера, що прибули (atRound ≤ round): число вже кинуте при касті, rng лише для наслідків шкоди. */
export function resolvePendingHits(ps: BattleParticipant[], casterId: string, ctx: PendingCtx): { participants: BattleParticipant[]; messages: LogLine[] } {
  const caster = findParticipant(ps, casterId);

  const hits = caster?.battleData.pendingHits;

  if (!caster || !hits?.length) return { participants: ps, messages: [] };

  const due = hits.filter((h) => h.atRound <= ctx.round);

  if (due.length === 0) return { participants: ps, messages: [] };

  const rest = hits.filter((h) => h.atRound > ctx.round);

  let next = replaceParticipant(ps, { ...caster, battleData: { ...caster.battleData, pendingHits: rest.length > 0 ? rest : undefined } });

  const messages: LogLine[] = [];

  for (const hit of due) {
    const target = findParticipant(next, hit.targetId);

    if (!target || !isActive(target) || target.battleData.escaped) {
      messages.push(textRef("battleLog.spellFx.pendingMiss", { spell: hit.spellName }));

      continue;
    }

    const { finalDamage } = applyResistance(target, hit.amount, hit.damageType, { participants: next, fromSpell: true, school: hit.school });

    next = replaceParticipant(next, applyRawDamage(target, finalDamage));
    messages.push(textRef("battleLog.spellFx.pendingHit", { spell: hit.spellName, target: target.basicInfo.name, damage: finalDamage }));

    const c = applyDamageConsequences({ before: target, after: findParticipant(next, hit.targetId) ?? target, amount: finalDamage, rules: ctx.rules, rng: ctx.rng, participants: next });

    next = c.participants;
    messages.push(...c.messages);

    const after = findParticipant(next, hit.targetId);

    if (after && !isActive(after)) {
      const d = resolveDowned(next, { victimId: hit.targetId, actorId: casterId }, ctx);

      next = d.participants;
      messages.push(...d.messages);
    }
  }

  return { participants: next, messages };
}
