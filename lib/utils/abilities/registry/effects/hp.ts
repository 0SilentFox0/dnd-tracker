import { amountLabel } from "../labels";
import type { EffectApplyInput, EffectApplyResult } from "./types";

import { CombatStatus } from "@/lib/constants/battle";
import { resolveAmount } from "@/lib/utils/abilities/engine/amount";
import { eventDamage } from "@/lib/utils/abilities/engine/events";
import { applyRawDamage } from "@/lib/utils/abilities/engine/hp";
import { findParticipant, isActive, replaceParticipant } from "@/lib/utils/abilities/engine/participants";
import { effectSource, upsertTimedEffect } from "@/lib/utils/abilities/engine/timed-effects";
import type { Effect } from "@/lib/utils/abilities/schema";
import { hasImmunity } from "@/lib/utils/battle/resistance";

type Of<K extends Effect["kind"]> = Extract<Effect, { kind: K }>;

export function applyDealDamage(input: EffectApplyInput<Of<"dealDamage">>): EffectApplyResult {
  const { ability, effect, ctx } = input;

  let ps = input.participants;

  const owner = findParticipant(ps, input.ownerId);

  if (!owner) return { participants: ps, messages: [] };

  const messages: string[] = [];

  const downed: EffectApplyResult["downed"] = [];

  for (const id of input.targetIds) {
    const t = findParticipant(ps, id);

    if (!t || !isActive(t)) continue;

    const amount = resolveAmount(effect.amount, { owner, target: t, eventDamage: eventDamage(input.event), rng: ctx.rng, participants: input.participants });

    if (amount <= 0) continue;

    const updated = applyRawDamage(t, amount);

    ps = replaceParticipant(ps, updated);
    messages.push(`💥 ${ability.name}: ${t.basicInfo.name} −${amount} HP`);

    if (!isActive(updated)) downed.push({ victimId: id, actorId: input.ownerId });
  }

  return { participants: ps, messages, downed };
}

export function applyHeal(input: EffectApplyInput<Of<"heal">>): EffectApplyResult {
  const { ability, effect, ctx } = input;

  let ps = input.participants;

  const owner = findParticipant(ps, input.ownerId);

  if (!owner) return { participants: ps, messages: [] };

  const messages: string[] = [];

  for (const id of input.targetIds) {
    const t = findParticipant(ps, id);

    if (!t || (!isActive(t) && !effect.revive)) continue;

    const amount = resolveAmount(effect.amount, { owner, target: t, eventDamage: eventDamage(input.event), rng: ctx.rng, participants: input.participants });

    const before = Math.max(0, t.combatStats.currentHp);

    const hp = Math.min(t.combatStats.maxHp, before + amount);

    if (hp <= before && isActive(t)) continue;

    ps = replaceParticipant(ps, {
      ...t,
      combatStats: { ...t.combatStats, currentHp: hp, status: hp > 0 ? CombatStatus.ACTIVE : t.combatStats.status },
    });
    messages.push(
      isActive(t)
        ? `💚 ${ability.name}: ${t.basicInfo.name} +${hp - before} HP`
        : `✝️ ${ability.name}: ${t.basicInfo.name} повертається з ${hp} HP`,
    );
  }

  return { participants: ps, messages };
}

export function applyDot(input: EffectApplyInput<Of<"dot">>): EffectApplyResult {
  const { ability, effect, ctx } = input;

  let ps = input.participants;

  const owner = findParticipant(ps, input.ownerId);

  if (!owner) return { participants: ps, messages: [] };

  const messages: string[] = [];

  for (const id of input.targetIds) {
    const t = findParticipant(ps, id);

    if (!t || !isActive(t)) continue;

    if (hasImmunity(t, effect.damageType, { participants: ps })) {
      messages.push(`⛔ ${ability.name}: ${t.basicInfo.name} — імунітет до ${effect.damageType}`);
      continue;
    }

    const dmg = resolveAmount(effect.damagePerRound, { owner, target: t, eventDamage: eventDamage(input.event), rng: ctx.rng, participants: input.participants });

    if (dmg <= 0) continue;

    ps = replaceParticipant(
      ps,
      upsertTimedEffect(
        t,
        {
          timedKey: `${ability.key}#${input.effectIndex}`,
          source: effectSource(findParticipant(input.participants, input.ownerId), ability),
          name: ability.name,
          type: "debuff",
          rounds: effect.duration.rounds,
          stackable: ability.stackable === true,
          maxStacks: ability.maxStacks,
          dotDamage: { damagePerRound: dmg, damageType: effect.damageType },
        },
        ctx.round,
      ),
    );
    messages.push(`🔥 ${ability.name}: ${effect.damageType} ${dmg}/раунд → ${t.basicInfo.name} (${effect.duration.rounds} р.)`);
  }

  return { participants: ps, messages };
}

export const describeDealDamage = (e: Of<"dealDamage">) => `шкода ${amountLabel(e.amount)}${e.damageType ? ` ${e.damageType}` : ""}`;

export const describeHeal = (e: Of<"heal">) => `${e.revive ? "воскресіння" : "лікування"} ${amountLabel(e.amount)}`;

export const describeDot = (e: Of<"dot">) => `${e.damageType} ${amountLabel(e.damagePerRound)}/раунд × ${e.duration?.rounds ?? "?"} р.`;
