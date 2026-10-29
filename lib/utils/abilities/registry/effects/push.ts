import type { EffectApplyInput, EffectApplyResult } from "./types";

import { CELL_FEET } from "@/lib/constants/battle";
import { findParticipant, isActive, replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import type { Effect } from "@/lib/utils/abilities/schema";
import { seg, type Segment } from "@/lib/utils/abilities/segments";
import { hazardHit, hazardUnder } from "@/lib/utils/battle/grid/hazard";
import { isOnMap } from "@/lib/utils/battle/grid/occupancy";
import { pushAway } from "@/lib/utils/battle/grid/push";

type PushEffect = Extract<Effect, { kind: "push" }>;

export const describePush = (e: PushEffect): Segment[] => [seg("summary.effects.push", { feet: e.feet })];

export function applyPush(input: EffectApplyInput<PushEffect>): EffectApplyResult {
  const { ability, effect, ctx } = input;

  let ps = input.participants;

  const owner = findParticipant(ps, input.ownerId);

  const map = ctx.map;

  const origin = owner?.battleData.position;

  if (!map || !origin) return { participants: ps, messages: [`↔️ ${ability.name}: відштовхування — без мапи не застосовано`] };

  const messages: string[] = [];

  const downed: EffectApplyResult["downed"] = [];

  for (const id of input.targetIds) {
    const target = findParticipant(ps, id);

    if (!target || !isActive(target) || !isOnMap(target) || id === input.ownerId) continue;

    const { position, steps } = pushAway(map, ps, origin, target, effect.feet / CELL_FEET);

    if (steps === 0) {
      messages.push(`↔️ ${target.basicInfo.name}: відштовхнути нікуди`);
      continue;
    }

    const moved = { ...target, battleData: { ...target.battleData, position } };

    ps = replaceParticipant(ps, moved);
    messages.push(`↔️ ${ability.name}: ${target.basicInfo.name} відштовхнуто на ${steps * CELL_FEET} фт`);

    const cell = hazardUnder(map, moved, undefined, ps);

    const hit = cell && hazardHit(moved, cell, ctx.round, ps, ctx.rng, ctx.rules);

    if (!hit) continue;

    ps = replaceParticipant(hit.participants, hit.participant);
    messages.push(hit.message, ...hit.consequences);

    if (!isActive(hit.participant)) downed.push({ victimId: id, actorId: input.ownerId });
  }

  return { participants: ps, messages, downed };
}
