import { amountLabel } from "../labels";
import type { EffectApplyInput, EffectApplyResult } from "./types";

import { CombatStatus } from "@/lib/constants/battle";
import { DAMAGE_ELEMENT_LABELS } from "@/lib/constants/damage";
import { resolveAmount } from "@/lib/utils/abilities/engine/core/amount";
import { eventDamage, eventSpellRoll } from "@/lib/utils/abilities/engine/core/events";
import { findParticipant, isActive, replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { applyRawDamage } from "@/lib/utils/abilities/engine/effects/hp";
import { effectSource, upsertTimedEffect } from "@/lib/utils/abilities/engine/effects/timed-effects";
import type { Effect } from "@/lib/utils/abilities/schema";
import { applyDamageConsequences } from "@/lib/utils/battle/damage/consequences";
import { clearDeathSaves, isDying } from "@/lib/utils/battle/death-saves";
import { hasImmunity } from "@/lib/utils/battle/resistance";
import type { BattleParticipant } from "@/types/battle";

type Of<K extends Effect["kind"]> = Extract<Effect, { kind: K }>;

export function applyDealDamage(input: EffectApplyInput<Of<"dealDamage">>): EffectApplyResult {
  const { ability, effect, ctx } = input;

  let ps = input.participants;

  const owner = findParticipant(ps, input.ownerId);

  if (!owner) return { participants: ps, messages: [] };

  const messages: string[] = [];

  const downed: EffectApplyResult["downed"] = [];

  for (const [index, id] of input.targetIds.entries()) {
    const t = findParticipant(ps, id);

    if (!t || !isActive(t)) continue;

    const rolled = resolveAmount(effect.amount, { owner, target: t, eventDamage: eventDamage(input.event), spellRoll: eventSpellRoll(input.event), rng: ctx.rng, participants: input.participants });

    const amount = effect.falloff ? Math.floor((rolled * effect.falloff[Math.min(index, effect.falloff.length - 1)]) / 100) : rolled;

    if (amount <= 0) continue;

    const c = applyDamageConsequences({ before: t, after: applyRawDamage(t, amount), amount, rules: ctx.rules, rng: ctx.rng, participants: ps });

    const updated = c.participant;

    ps = replaceParticipant(c.participants, updated);
    messages.push(`💥 ${ability.name}: ${t.basicInfo.name} −${amount} HP`, ...c.messages);

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

  const label = owner && !input.targetIds.every((id) => id === owner.basicInfo.id) ? `${ability.name} (${owner.basicInfo.name})` : ability.name;

  for (const id of input.targetIds) {
    const t = findParticipant(ps, id);

    if (!t || (!isActive(t) && !effect.revive && !isDying(t))) continue;

    const amount = resolveAmount(effect.amount, { owner, target: t, eventDamage: eventDamage(input.event), spellRoll: eventSpellRoll(input.event), rng: ctx.rng, participants: input.participants });

    const before = Math.max(0, t.combatStats.currentHp);

    const hp = Math.min(t.combatStats.maxHp, before + amount);

    if (hp <= before && isActive(t)) continue;

    const healed = {
      ...t,
      combatStats: { ...t.combatStats, currentHp: hp, status: hp > 0 ? CombatStatus.ACTIVE : t.combatStats.status },
    };

    ps = replaceParticipant(ps, hp > 0 ? clearDeathSaves(healed) : healed);
    messages.push(
      isActive(t)
        ? `💚 ${label}: ${t.basicInfo.name} +${hp - before} HP`
        : `✝️ ${label}: ${t.basicInfo.name} повертається з ${hp} HP`,
    );
  }

  return { participants: ps, messages };
}

const linkedConditionId = (target: BattleParticipant, abilityKey: string, ownerId: string) =>
  target.battleData.activeEffects.find((e) => e.type === "condition" && e.abilityKey?.startsWith(`${abilityKey}#`) && e.source?.participantId === ownerId)?.id;

export function applyDot(input: EffectApplyInput<Of<"dot">>): EffectApplyResult {
  const { ability, effect, ctx } = input;

  let ps = input.participants;

  const owner = findParticipant(ps, input.ownerId);

  if (!owner) return { participants: ps, messages: [] };

  const messages: string[] = [];

  const fromSpell = input.event.type === "spellCast";

  for (const id of input.targetIds) {
    const t = findParticipant(ps, id);

    if (!t || !isActive(t)) continue;

    if (hasImmunity(t, effect.damageType, { participants: ps, fromSpell })) {
      messages.push(`⛔ ${ability.name}: ${t.basicInfo.name} — імунітет до ${effect.damageType}`);
      continue;
    }

    const dmg = resolveAmount(effect.damagePerRound, { owner, target: t, eventDamage: eventDamage(input.event), spellRoll: eventSpellRoll(input.event), rng: ctx.rng, participants: input.participants });

    if (dmg <= 0) continue;

    const linkedTo = effect.linkedToCondition ? linkedConditionId(t, ability.key, input.ownerId) : undefined;

    if (effect.linkedToCondition && !linkedTo) continue;

    ps = replaceParticipant(
      ps,
      upsertTimedEffect(
        t,
        {
          timedKey: `${ability.key}#${input.effectIndex}`,
          source: effectSource(findParticipant(input.participants, input.ownerId), ability),
          name: ability.name,
          type: "debuff",
          linkedTo,
          rounds: effect.duration.rounds,
          stackable: ability.stackable === true,
          maxStacks: ability.maxStacks,
          dotDamage: { damagePerRound: dmg, damageType: effect.damageType, ...(fromSpell && { fromSpell: true }) },
        },
        ctx.round,
      ),
    );
    messages.push(`🔥 ${ability.name}: ${effect.damageType} ${dmg}/раунд → ${t.basicInfo.name} (${effect.duration.rounds} р.)`);
  }

  return { participants: ps, messages };
}

export function applyHot(input: EffectApplyInput<Of<"hot">>): EffectApplyResult {
  const { ability, effect, ctx } = input;

  let ps = input.participants;

  const owner = findParticipant(ps, input.ownerId);

  if (!owner) return { participants: ps, messages: [] };

  const messages: string[] = [];

  for (const id of input.targetIds) {
    const t = findParticipant(ps, id);

    if (!t || !isActive(t)) continue;

    const heal = resolveAmount(effect.healPerRound, { owner, target: t, eventDamage: eventDamage(input.event), spellRoll: eventSpellRoll(input.event), rng: ctx.rng, participants: input.participants });

    if (heal <= 0) continue;

    ps = replaceParticipant(
      ps,
      upsertTimedEffect(
        t,
        {
          timedKey: `${ability.key}#${input.effectIndex}`,
          source: effectSource(owner, ability),
          name: ability.name,
          type: "buff",
          rounds: effect.duration.rounds,
          stackable: ability.stackable === true,
          maxStacks: ability.maxStacks,
          hotHeal: { healPerRound: heal },
        },
        ctx.round,
      ),
    );
    messages.push(`💚 ${ability.name}: +${heal} HP/раунд → ${t.basicInfo.name} (${effect.duration.rounds} р.)`);
  }

  return { participants: ps, messages };
}

const damageTypeLabel = (type: string) => DAMAGE_ELEMENT_LABELS[type] ?? type;

export const describeDealDamage = (e: Of<"dealDamage">) => `шкода ${amountLabel(e.amount)}${e.damageType ? ` ${damageTypeLabel(e.damageType)}` : ""}${e.falloff ? ` (${e.falloff.join("% → ")}%)` : ""}`;

export const describeHeal = (e: Of<"heal">) => `${e.revive ? "воскресіння" : "лікування"} ${amountLabel(e.amount)}`;

export const describeDot = (e: Of<"dot">) => `${damageTypeLabel(e.damageType)} ${amountLabel(e.damagePerRound)}/раунд × ${e.duration?.rounds ?? "?"} р.${e.linkedToCondition ? ", поки діє стан" : ""}`;

export const describeHot = (e: Of<"hot">) => `лікування ${amountLabel(e.healPerRound)}/раунд × ${e.duration?.rounds ?? "?"} р.`;
