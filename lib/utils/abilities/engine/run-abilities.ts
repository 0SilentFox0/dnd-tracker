import { findParticipant, isActive, resolvedAbilitiesOf, updateParticipant } from "./participants";
import { resolveTargetIds } from "./targets";
import type { AbilityRunContext, AbilityRunResult, Downed } from "./types";
import { recordUse, resetUsage, withinLimits } from "./usage";

import { evaluateCondition } from "@/lib/utils/abilities/registry/conditions";
import { applyEffect } from "@/lib/utils/abilities/registry/effects";
import { triggerMatches } from "@/lib/utils/abilities/registry/triggers";
import type { StaticEffect } from "@/lib/utils/abilities/schema";
import type { AbilityEvent } from "@/types/abilities";
import type { BattleParticipant } from "@/types/battle";

function applyUsageResets(ps: BattleParticipant[], event: AbilityEvent): BattleParticipant[] {
  if (event.type === "roundStart") return ps.map((p) => resetUsage(p, "round"));

  if (event.type === "turnStart") return updateParticipant(ps, event.actorId, (p) => resetUsage(p, "turn"));

  return ps;
}

function canAct(owner: BattleParticipant, event: AbilityEvent): boolean {
  return isActive(owner) || (event.type === "lethalDamage" && event.targetId === owner.basicInfo.id);
}

export function runAbilities(participants: BattleParticipant[], event: AbilityEvent, ctx: AbilityRunContext): AbilityRunResult {
  let ps = applyUsageResets(participants, event);

  const messages: string[] = [];

  const actionModifiers: Record<string, StaticEffect[]> = {};

  const fired: string[] = [];

  const downed: Downed[] = [];

  for (const start of participants) {
    const ownerId = start.basicInfo.id;

    for (const ability of resolvedAbilitiesOf(findParticipant(ps, ownerId) ?? start)) {
      const owner = findParticipant(ps, ownerId);

      if (!owner || !canAct(owner, event)) break;

      if (event.type === "bonusAction" && ability.key !== event.abilityKey) continue;

      if (!triggerMatches(ability.trigger, event, owner, ps)) continue;

      if (ability.condition && !evaluateCondition(ability.condition, { owner, event, participants: ps })) continue;

      if (!withinLimits(owner, ability)) continue;

      if (ability.limits?.chance !== undefined && ctx.rng() * 100 >= ability.limits.chance) continue;

      ps = updateParticipant(ps, ownerId, (p) => recordUse(p, ability.key));
      fired.push(ability.key);

      for (const [effectIndex, effect] of ability.effects.entries()) {
        const targetIds = resolveTargetIds("target" in effect ? effect.target : undefined, ownerId, event, ps);

        const r = applyEffect({ participants: ps, ability, effectIndex, ownerId, effect, targetIds, event, ctx });

        ps = r.participants;
        messages.push(...r.messages.map((m) => (ability.limits?.chance !== undefined ? `${m} (шанс ${ability.limits.chance} %)` : m)));

        for (const m of r.actionModifiers ?? []) (actionModifiers[m.participantId] ??= []).push(m.effect);

        downed.push(...(r.downed ?? []));
      }
    }
  }

  if ((ctx.depth ?? 0) === 0) {
    for (const d of downed) {
      const r = resolveDowned(ps, d, { ...ctx, depth: 1 });

      ps = r.participants;
      messages.push(...r.messages);
    }
  }

  return { participants: ps, messages, actionModifiers, fired };
}

export function resolveDowned(
  participants: BattleParticipant[],
  downed: Downed,
  ctx: AbilityRunContext,
  opts: { allowSurvive?: boolean } = {},
): { participants: BattleParticipant[]; messages: string[]; survived: boolean } {
  const victim = findParticipant(participants, downed.victimId);

  if (!victim || isActive(victim)) return { participants, messages: [], survived: true };

  const deep = { ...ctx, depth: 1 };

  let ps = participants;

  const messages: string[] = [];

  if (opts.allowSurvive !== false) {
    const lethal = runAbilities(ps, { type: "lethalDamage", actorId: downed.actorId, targetId: downed.victimId }, deep);

    ps = lethal.participants;
    messages.push(...lethal.messages);

    const after = findParticipant(ps, downed.victimId);

    if (after && isActive(after)) return { participants: ps, messages, survived: true };
  }

  const kill = runAbilities(ps, { type: "kill", actorId: downed.actorId, targetId: downed.victimId }, deep);

  return { participants: kill.participants, messages: [...messages, ...kill.messages], survived: false };
}
