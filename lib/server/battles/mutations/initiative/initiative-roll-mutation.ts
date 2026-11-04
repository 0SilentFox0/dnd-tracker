import { z } from "zod";

import { textRef } from "@/lib/i18n/text-ref";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { dmEvent } from "@/lib/utils/battle/store";
import { rollInitiative } from "@/lib/utils/battle/turn";
import { rngOf } from "@/lib/utils/common/rng";
import type { DiceRollGroup } from "@/types/battle";

export const initiativeRollSchema = z.object({});

export function initiativeRollMutation(ctx: BattleMutationContext, _body: z.infer<typeof initiativeRollSchema>): MutationResult {
  const { participants, rolls } = rollInitiative(ctx.participants, rngOf(ctx));

  const nameOf = new Map(participants.map((p) => [p.basicInfo.id, p.basicInfo.name]));

  const list = rolls.map((r) => `${nameOf.get(r.id)}: ${r.total}`).join("; ");

  const targets = rolls.map((r) => ({ participantId: r.id, participantName: nameOf.get(r.id) ?? "" }));

  const diceRolls: DiceRollGroup[] = rolls.map((r) => ({ kind: "initiative", rollerId: r.id, dice: [{ sides: 20, value: r.d20 }] }));

  return {
    participants,
    pending: ctx.pending,
    scene: { turnIndex: 0 },
    reordered: true,
    events: [dmEvent(ctx.scene.round, textRef("battleLog.dm.initiativeRolled", { list }), targets, undefined, diceRolls)],
  };
}
