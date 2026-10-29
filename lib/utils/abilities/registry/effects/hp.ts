import { amountSegment, damageTypeSegment } from "../labels";
import type { EffectApplyInput, EffectApplyResult } from "./types";

import { CombatStatus } from "@/lib/constants/battle";
import { textRef } from "@/lib/i18n/text-ref";
import { resolveAmount } from "@/lib/utils/abilities/engine/core/amount";
import { eventDamage, eventSpellRoll } from "@/lib/utils/abilities/engine/core/events";
import { findParticipant, isActive, replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { applyRawDamage } from "@/lib/utils/abilities/engine/effects/hp";
import { effectSource, upsertTimedEffect } from "@/lib/utils/abilities/engine/effects/timed-effects";
import type { Effect } from "@/lib/utils/abilities/schema";
import { seg, type Segment } from "@/lib/utils/abilities/segments";
import { applyDamageConsequences } from "@/lib/utils/battle/damage/consequences";
import { clearDeathSaves, isDying } from "@/lib/utils/battle/death-saves";
import { hasImmunity } from "@/lib/utils/battle/resistance";
import { forgoDice } from "@/lib/utils/common/dice";
import type { BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

type Of<K extends Effect["kind"]> = Extract<Effect, { kind: K }>;

export function applyDealDamage(input: EffectApplyInput<Of<"dealDamage">>): EffectApplyResult {
  const { ability, effect, ctx } = input;

  let ps = input.participants;

  const owner = findParticipant(ps, input.ownerId);

  if (!owner) return { participants: ps, messages: [] };

  const messages: LogLine[] = [];

  const downed: EffectApplyResult["downed"] = [];

  for (const [index, id] of input.targetIds.entries()) {
    const t = findParticipant(ps, id);

    if (!t || !isActive(t)) continue;

    const forgone = ability.params?.sneakAttack && input.event.type === "hit" ? input.event.cunningDice ?? 0 : 0;

    const rolled = resolveAmount(forgoDice(effect.amount, forgone), { owner, target: t, eventDamage: eventDamage(input.event), spellRoll: eventSpellRoll(input.event), rng: ctx.rng, participants: input.participants });

    const amount = effect.falloff ? Math.floor((rolled * effect.falloff[Math.min(index, effect.falloff.length - 1)]) / 100) : rolled;

    if (amount <= 0) continue;

    const c = applyDamageConsequences({ before: t, after: applyRawDamage(t, amount), amount, rules: ctx.rules, rng: ctx.rng, participants: ps });

    const updated = c.participant;

    ps = replaceParticipant(c.participants, updated);
    messages.push(textRef("abilityText.log.damage", { ability: ability.name, target: t.basicInfo.name, amount }), ...c.messages);

    if (!isActive(updated)) downed.push({ victimId: id, actorId: input.ownerId });
  }

  return { participants: ps, messages, downed };
}

export function applyHeal(input: EffectApplyInput<Of<"heal">>): EffectApplyResult {
  const { ability, effect, ctx } = input;

  let ps = input.participants;

  const owner = findParticipant(ps, input.ownerId);

  if (!owner) return { participants: ps, messages: [] };

  const messages: LogLine[] = [];

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
        ? textRef("abilityText.log.heal", { label, target: t.basicInfo.name, amount: hp - before })
        : textRef("abilityText.log.revive", { label, target: t.basicInfo.name, hp }),
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

  const messages: LogLine[] = [];

  const fromSpell = input.event.type === "spellCast";

  for (const id of input.targetIds) {
    const t = findParticipant(ps, id);

    if (!t || !isActive(t)) continue;

    if (hasImmunity(t, effect.damageType, { participants: ps, fromSpell })) {
      messages.push(textRef("abilityText.log.immuneTo", { ability: ability.name, target: t.basicInfo.name, type: effect.damageType }));
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
          dotDamage: { damagePerRound: dmg, ...(typeof effect.damagePerRound === "string" && { dice: effect.damagePerRound }), damageType: effect.damageType, ...(fromSpell && { fromSpell: true }) },
        },
        ctx.round,
      ),
    );
    messages.push(textRef("abilityText.log.dot", { ability: ability.name, type: effect.damageType, amount: dmg, target: t.basicInfo.name, rounds: effect.duration.rounds }));
  }

  return { participants: ps, messages };
}

export function applyHot(input: EffectApplyInput<Of<"hot">>): EffectApplyResult {
  const { ability, effect, ctx } = input;

  let ps = input.participants;

  const owner = findParticipant(ps, input.ownerId);

  if (!owner) return { participants: ps, messages: [] };

  const messages: LogLine[] = [];

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
    messages.push(textRef("abilityText.log.hot", { ability: ability.name, amount: heal, target: t.basicInfo.name, rounds: effect.duration.rounds }));
  }

  return { participants: ps, messages };
}

const rounds = (e: { duration?: { rounds: number } }) => e.duration?.rounds ?? "?";

export const describeDealDamage = (e: Of<"dealDamage">): Segment[] => [
  seg("summary.effects.dealDamage", {
    amount: amountSegment(e.amount),
    hasType: e.damageType ? "yes" : "no",
    ...(e.damageType && { type: damageTypeSegment(e.damageType) }),
    hasFalloff: e.falloff ? "yes" : "no",
    ...(e.falloff && { falloff: e.falloff.join("% → ") }),
  }),
];

export const describeHeal = (e: Of<"heal">): Segment[] => [seg("summary.effects.heal", { revive: e.revive ? "yes" : "no", amount: amountSegment(e.amount) })];

export const describeDot = (e: Of<"dot">): Segment[] => [seg("summary.effects.dot", { type: damageTypeSegment(e.damageType), amount: amountSegment(e.damagePerRound), rounds: rounds(e), linked: e.linkedToCondition ? "yes" : "no" })];

export const describeHot = (e: Of<"hot">): Segment[] => [seg("summary.effects.hot", { amount: amountSegment(e.healPerRound), rounds: rounds(e) })];
