import { findParticipant, inPlay, isActive, replaceParticipant, resolvedAbilitiesOf, updateParticipant } from "./participants";
import { resolveTargetIds } from "./targets";
import type { AbilityRunContext, AbilityRunResult, Downed, SummonRequest } from "./types";
import { recordUse, resetUsage, withinLimits } from "./usage";

import { joinLines } from "@/lib/i18n/text-ref";
import { restoreCharm } from "@/lib/utils/abilities/engine/effects/charm";
import { conditionEventForTarget, evaluateCondition, hasCreatureTypeCondition } from "@/lib/utils/abilities/registry/conditions";
import { applyEffect } from "@/lib/utils/abilities/registry/effects";
import { triggerMatches } from "@/lib/utils/abilities/registry/triggers";
import type { StaticEffect } from "@/lib/utils/abilities/schema";
import type { AbilityEvent } from "@/types/abilities";
import type { BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

function applyUsageResets(ps: BattleParticipant[], event: AbilityEvent): BattleParticipant[] {
  if (event.type === "roundStart") return ps.map((p) => resetUsage(p, "round"));

  if (event.type === "turnStart") return updateParticipant(ps, event.actorId, (p) => resetUsage(p, "turn"));

  return ps;
}

function canAct(owner: BattleParticipant, event: AbilityEvent): boolean {
  return inPlay(owner) || (event.type === "lethalDamage" && event.targetId === owner.basicInfo.id);
}

export function runAbilities(participants: BattleParticipant[], event: AbilityEvent, ctx: AbilityRunContext): AbilityRunResult {
  let ps = applyUsageResets(participants, event);

  const messages: LogLine[] = [];

  const actionModifiers: Record<string, StaticEffect[]> = {};

  const fired: string[] = [];

  const downed: Downed[] = [];

  const summons: SummonRequest[] = [];

  for (const start of participants) {
    const ownerId = start.basicInfo.id;

    for (const ability of resolvedAbilitiesOf(findParticipant(ps, ownerId) ?? start)) {
      const owner = findParticipant(ps, ownerId);

      if (!owner || !canAct(owner, event)) break;

      if ((event.type === "bonusAction" || event.type === "action") && ability.key !== event.abilityKey) continue;

      if (!triggerMatches(ability.trigger, event, owner, ps)) continue;

      const perTarget = hasCreatureTypeCondition(ability.condition);

      if (ability.condition && !perTarget && !evaluateCondition(ability.condition, { owner, event, participants: ps, sourceId: ability.source.id })) continue;

      const effects = ability.effects.map((effect, effectIndex) => ({ effect, effectIndex, targetIds: resolveTargetIds("target" in effect ? effect.target : undefined, ownerId, event, ps, ctx).filter((id) => !perTarget || !ability.condition || evaluateCondition(ability.condition, { owner, event: conditionEventForTarget(event, id), participants: ps, sourceId: ability.source.id })) }));

      if (perTarget && !effects.some(({ targetIds }) => targetIds.length > 0)) continue;

      if (!withinLimits(owner, ability, ctx.round)) continue;

      if (ability.limits?.chance !== undefined && ctx.rng() * 100 >= ability.limits.chance) {
        // лише вміння самого діяча: чужі шансові тригери на кожну подію засмітили б журнал
        if ("actorId" in event && event.actorId === ownerId) messages.push(`🎲 ${ability.name}: не спрацювало (шанс ${ability.limits.chance} %)`);

        continue;
      }

      ps = updateParticipant(ps, ownerId, (p) => recordUse(p, ability.key, ctx.round, ability.limits?.pool));
      fired.push(ability.key);

      for (const { effectIndex, effect, targetIds: filteredIds } of effects) {
        const targetIds = perTarget ? filteredIds : resolveTargetIds("target" in effect ? effect.target : undefined, ownerId, event, ps, ctx);

        const r = applyEffect({ participants: ps, ability, effectIndex, ownerId, effect, targetIds, event, ctx });

        ps = r.participants;
        messages.push(...r.messages.map((m) => (ability.limits?.chance !== undefined ? joinLines([m, ` (шанс ${ability.limits.chance} %)`]) : m)));

        for (const m of r.actionModifiers ?? []) (actionModifiers[m.participantId] ??= []).push(m.effect);

        downed.push(...(r.downed ?? []));
        summons.push(...(r.summons ?? []));
      }
    }
  }

  if ((ctx.depth ?? 0) === 0) {
    for (const d of downed) {
      const r = resolveDowned(ps, d, { ...ctx, depth: 1 });

      ps = r.participants;
      messages.push(...r.messages);
      summons.push(...r.summons);
    }
  }

  return { participants: ps, messages, actionModifiers, fired, summons };
}

export function resolveDowned(
  participants: BattleParticipant[],
  downed: Downed,
  ctx: AbilityRunContext,
  opts: { allowSurvive?: boolean } = {},
): { participants: BattleParticipant[]; messages: LogLine[]; survived: boolean; summons: SummonRequest[] } {
  const victim = findParticipant(participants, downed.victimId);

  if (!victim || isActive(victim)) return { participants, messages: [], survived: true, summons: [] };

  const deep = { ...ctx, depth: 1 };

  let ps = replaceParticipant(participants, restoreCharm(victim));

  const messages: LogLine[] = [];

  const summons: SummonRequest[] = [];

  if (opts.allowSurvive !== false) {
    const lethal = runAbilities(ps, { type: "lethalDamage", actorId: downed.actorId, targetId: downed.victimId }, deep);

    ps = lethal.participants;
    messages.push(...lethal.messages);
    summons.push(...lethal.summons);

    const after = findParticipant(ps, downed.victimId);

    if (after && isActive(after)) return { participants: ps, messages, survived: true, summons };
  }

  const kill = runAbilities(ps, { type: "kill", actorId: downed.actorId, targetId: downed.victimId }, deep);

  return { participants: kill.participants, messages: [...messages, ...kill.messages], survived: false, summons: [...summons, ...kill.summons] };
}
