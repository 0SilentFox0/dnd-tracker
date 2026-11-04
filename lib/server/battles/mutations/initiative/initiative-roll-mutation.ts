import { z } from "zod";

import { turnStartEvents } from "./turn-start-events";

import { textRef } from "@/lib/i18n/text-ref";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { dmEvent } from "@/lib/utils/battle/store";
import { enterChangedTurn } from "@/lib/utils/battle/turn/enter-turn";
import { rollInitiative } from "@/lib/utils/battle/turn/roll-initiative";
import { rngOf } from "@/lib/utils/common/rng";
import type { DiceRollGroup, DieSides } from "@/types/battle";

export const initiativeRollSchema = z.object({});

export function initiativeRollMutation(ctx: BattleMutationContext, _body: z.infer<typeof initiativeRollSchema>): MutationResult {
  const rng = rngOf(ctx);

  const rolled = rollInitiative(ctx.participants, rng, ctx.meta.rules);

  const { rolls } = rolled;

  const entered = enterChangedTurn({ before: ctx.participants, after: rolled.participants, fromIndex: ctx.scene.turnIndex, toIndex: 0, round: ctx.scene.round, rng, map: ctx.meta.map, rules: ctx.meta.rules });

  const { participants } = entered;

  const nameOf = new Map(participants.map((p) => [p.basicInfo.id, p.basicInfo.name]));

  const list = rolls.map((r) => `${nameOf.get(r.id)}: ${r.total}`).join("; ");

  const targets = rolls.map((r) => ({ participantId: r.id, participantName: nameOf.get(r.id) ?? "" }));

  const diceRolls: DiceRollGroup[] = rolls.map((r) => ({ kind: "initiative", rollerId: r.id, dice: [{ sides: r.sides as DieSides, value: r.roll }] }));

  return {
    participants,
    pending: ctx.pending,
    scene: { turnIndex: entered.turnIndex },
    reordered: true,
    events: [dmEvent(ctx.scene.round, textRef("battleLog.dm.initiativeRolled", { list }), targets, undefined, diceRolls), ...turnStartEvents(ctx.scene.round, entered.messages)],
  };
}
