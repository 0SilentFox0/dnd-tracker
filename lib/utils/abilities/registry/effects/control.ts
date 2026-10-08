import { immuneTo } from "./state";
import type { EffectApplyInput, EffectApplyResult } from "./types";

import { ParticipantSourceType } from "@/lib/constants/battle";
import { findParticipant, isActive, replaceParticipant } from "@/lib/utils/abilities/engine/participants";
import { effectSource, upsertTimedEffect } from "@/lib/utils/abilities/engine/timed-effects";
import type { Effect } from "@/lib/utils/abilities/schema";

type Of<K extends Effect["kind"]> = Extract<Effect, { kind: K }>;

export function applyBerserk(input: EffectApplyInput<Of<"berserk">>): EffectApplyResult {
  const { ability, effect, ctx } = input;

  let ps = input.participants;

  const owner = findParticipant(ps, input.ownerId);

  const messages: string[] = [];

  for (const id of input.targetIds) {
    const t = findParticipant(ps, id);

    if (!t || !isActive(t)) continue;

    if (t.basicInfo.sourceType === ParticipantSourceType.CHARACTER) {
      messages.push(`⛔ ${ability.name}: ${t.basicInfo.name} — не діє на героїв`);
      continue;
    }

    if (immuneTo(ps, id, "berserk")) {
      messages.push(`⛔ ${ability.name}: ${t.basicInfo.name} — імунітет`);
      continue;
    }

    ps = replaceParticipant(
      ps,
      upsertTimedEffect(
        t,
        {
          timedKey: `${ability.key}#${input.effectIndex}`,
          source: effectSource(owner, ability),
          name: ability.name,
          type: "condition",
          rounds: effect.duration.rounds,
          stackable: false,
          effects: [{ type: "berserk", value: effect.damageBonusPercent }],
        },
        ctx.round,
      ),
    );
    messages.push(`🤬 ${ability.name}: ${t.basicInfo.name} у люті (${effect.duration.rounds} р.)`);
  }

  return { participants: ps, messages };
}

export function applyCharm(input: EffectApplyInput<Of<"charm">>): EffectApplyResult {
  const { ability, effect, ctx } = input;

  let ps = input.participants;

  const owner = findParticipant(ps, input.ownerId);

  if (!owner) return { participants: ps, messages: [] };

  const messages: string[] = [];

  for (const id of input.targetIds) {
    const t = findParticipant(ps, id);

    if (!t || !isActive(t)) continue;

    if (t.basicInfo.sourceType === ParticipantSourceType.CHARACTER) {
      messages.push(`⛔ ${ability.name}: ${t.basicInfo.name} — не діє на героїв`);
      continue;
    }

    if (immuneTo(ps, id, "charm")) {
      messages.push(`⛔ ${ability.name}: ${t.basicInfo.name} — імунітет`);
      continue;
    }

    if (t.basicInfo.side === owner.basicInfo.side || t.battleData.activeEffects.some((e) => e.charmOrigin)) continue;

    const charmed = upsertTimedEffect(
      t,
      {
        timedKey: `${ability.key}#${input.effectIndex}`,
        source: effectSource(owner, ability),
        name: ability.name,
        type: "condition",
        rounds: effect.duration.rounds,
        stackable: false,
        effects: [{ type: "charm", value: 1 }],
        charmOrigin: { side: t.basicInfo.side, controlledBy: t.basicInfo.controlledBy },
      },
      ctx.round,
    );

    ps = replaceParticipant(ps, { ...charmed, basicInfo: { ...charmed.basicInfo, side: owner.basicInfo.side, controlledBy: owner.basicInfo.controlledBy } });
    messages.push(`🪄 ${ability.name}: ${t.basicInfo.name} переходить на бік ${owner.basicInfo.name} (${effect.duration.rounds} р.)`);
  }

  return { participants: ps, messages };
}

export const describeBerserk = (e: Of<"berserk">) => `шал: автоатака випадкової істоти, +${e.damageBonusPercent}% шкоди × ${e.duration?.rounds ?? "?"} р.`;

export const describeCharm = (e: Of<"charm">) => `перехід на бік заклинателя × ${e.duration?.rounds ?? "?"} р.`;
