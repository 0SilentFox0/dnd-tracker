import { DURATION_FIELD, type FieldMeta, TARGET_FIELD } from "../fields";
import { damageFilterSegment, flatSegment, percentSegment, statSegment } from "../labels";
import { immuneTo } from "./state";
import type { EffectApplyInput, EffectApplyResult } from "./types";

import { ABILITY_KEYS } from "@/lib/constants/abilities";
import { AttackType } from "@/lib/constants/battle";
import { lineKey, textRef } from "@/lib/i18n/text-ref";
import { findParticipant, participantNames, updateParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { abilityNature } from "@/lib/utils/abilities/engine/effects/effect-nature";
import { applySpellTimedEffect } from "@/lib/utils/abilities/engine/effects/opposing-spells";
import { effectSource } from "@/lib/utils/abilities/engine/effects/timed-effects";
import type { Effect, Flat, StaticEffect } from "@/lib/utils/abilities/schema";
import { DAMAGE_FILTER_KINDS,STAT_KEYS } from "@/lib/utils/abilities/schema/kinds";
import { seg, type Segment } from "@/lib/utils/abilities/segments";
import type { LogLine } from "@/types/text";

function stripTiming(effect: StaticEffect): StaticEffect {
  const { duration: _d, target: _t, ...rest } = effect;

  return rest as StaticEffect;
}

export function applyStatic(input: EffectApplyInput<StaticEffect>, describe: (e: Effect) => LogLine): EffectApplyResult {
  const { effect, ability, targetIds, ctx } = input;

  const stripped = stripTiming(effect);

  if (!effect.duration) {
    return {
      participants: input.participants,
      messages: [],
      actionModifiers: targetIds.map((participantId) => ({ participantId, effect: stripped })),
    };
  }

  const rounds = effect.duration.rounds;

  const owner = findParticipant(input.participants, input.ownerId);

  let ps = input.participants;

  const timedKey = `${ability.key}#${input.effectIndex}`;

  const cancelled: LogLine[] = [];

  const fearBlocked = effect.kind === "modifyStat" && effect.stat === "morale" && typeof effect.flat === "number" && effect.flat < 0;

  const consumeOn = effect.kind === "flag" && effect.flag === "advantage" ? effect.consumeOn : undefined;

  const until = (effect.kind === "flag" && effect.flag === "advantage") || effect.kind === "modifyStat" ? effect.until : undefined;

  const nature = abilityNature(ability.effects);

  const blocked = fearBlocked ? targetIds.filter((id) => immuneTo(input.participants, id, "fear")) : [];

  for (const id of targetIds.filter((t) => !blocked.includes(t))) {
    ps = updateParticipant(ps, id, (target) => {
      const { participant, removed } = applySpellTimedEffect(
        target,
        {
          timedKey,
          source: effectSource(owner, ability),
          name: ability.name,
          // дебафф області на союзнику лишається дебаффом: інакше Очищення його не знімає, а токен світиться як бафф
          type: nature ?? (target.basicInfo.side === owner?.basicInfo.side ? "buff" : "debuff"),
          rounds,
          stackable: ability.stackable === true,
          maxStacks: ability.maxStacks,
          abilityEffects: [stripped],
          ...(consumeOn && { consumeOn }),
          ...(until && { until }),
        },
        ctx.round,
      );

      for (const e of removed) cancelled.push(textRef("abilityText.log.cancelsEffect", { ability: ability.name, effect: e.name, target: target.basicInfo.name }));

      return participant;
    });
  }

  const applied = targetIds.filter((t) => !blocked.includes(t));

  const messages: LogLine[] = [...new Map(cancelled.map((line) => [lineKey(line), line])).values(), ...(applied.length ? [textRef("abilityText.log.applied", { ability: ability.name, effect: describe(effect), target: participantNames(ps, applied), rounds })] : [])];

  if (blocked.length) messages.push(textRef("abilityText.log.immune", { ability: ability.name, target: participantNames(ps, blocked) }));

  return { participants: ps, messages };
}

const VALUE_FIELDS: readonly FieldMeta[] = [
  { name: "flat", input: "flat", optional: true },
  { name: "percent", input: "flat", optional: true },
];

export const modifyStatFields: readonly FieldMeta[] = [
  { name: "stat", input: "select", options: STAT_KEYS.map((value) => ({ value })) },
  ...VALUE_FIELDS,
  { name: "atLeast", input: "number", optional: true, visibleWhen: (e) => [...ABILITY_KEYS, "armor", "speed"].includes(String(e.stat)) },
  { name: "attackKind", input: "select", optional: true, options: [{ value: AttackType.MELEE }, { value: AttackType.RANGED }], visibleWhen: (e) => e.stat === "attackBonus" },
  { name: "spellLevels", input: "numberList", visibleWhen: (e) => e.stat === "spellSlots" },
  TARGET_FIELD,
  DURATION_FIELD,
  { name: "until", input: "select", optional: true, options: [{ value: "turnEnd" }] },
];

export const damageBonusFields: readonly FieldMeta[] = [
  { name: "filter.kind", input: "select", options: DAMAGE_FILTER_KINDS.map((value) => ({ value })) },
  { name: "filter.school", input: "text", optional: true },
  ...VALUE_FIELDS,
  { name: "perMark", input: "text", optional: true },
  TARGET_FIELD,
  DURATION_FIELD,
];

function valueSegment(e: { flat?: Flat | { spellRoll: number }; percent?: Flat }): Segment {
  const items = [e.flat !== undefined ? flatSegment(e.flat) : null, e.percent !== undefined ? percentSegment(e.percent) : null].filter((x): x is Segment => !!x);

  return seg("summary.text", { value: { join: " ", items } });
}

export function describeModifyStat(e: Extract<Effect, { kind: "modifyStat" }>): Segment[] {
  if (e.atLeast !== undefined) return [seg("summary.effects.statAtLeast", { stat: statSegment(e.stat), n: e.atLeast })];

  return [seg("summary.effects.stat", { stat: statSegment(e.stat), hasLevels: e.spellLevels ? "yes" : "no", ...(e.spellLevels && { levels: e.spellLevels.join(", ") }), value: valueSegment(e) })];
}

export function describeDamageBonus(e: Extract<Effect, { kind: "damageBonus" }>): Segment[] {
  return [
    seg("summary.effects.damageBonus", {
      filter: damageFilterSegment(e.filter.kind),
      hasSchool: e.filter.school ? "yes" : "no",
      value: valueSegment(e),
      hasMark: e.perMark ? "yes" : "no",
      ...(e.perMark && { mark: e.perMark }),
    }),
  ];
}
