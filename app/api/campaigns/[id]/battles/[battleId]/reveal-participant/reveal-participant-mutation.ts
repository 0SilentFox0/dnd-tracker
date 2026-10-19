import { z } from "zod";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { applyBakedAuras } from "@/lib/utils/abilities/build/bake";
import { runAbilities } from "@/lib/utils/abilities/engine/core/run-abilities";
import { dropBattleFlag, isReserved } from "@/lib/utils/battle/participant/reserve";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleAccessError, dmEvent } from "@/lib/utils/battle/store";
import { calculateInitiative } from "@/lib/utils/battle/turn/initiative";
import type { BattleParticipant } from "@/types/battle";

export const revealParticipantSchema = z.object({ participantIds: z.array(z.string()).min(1) });

export type RevealParticipantBody = z.infer<typeof revealParticipantSchema>;

function insertAfterCurrent(order: BattleParticipant[], turnIndex: number, p: BattleParticipant): BattleParticipant[] {
  let at = turnIndex + 1;

  while (order[at]?.battleData.revealPending) at++;

  return [...order.slice(0, at), p, ...order.slice(at)];
}

export function revealParticipantMutation(ctx: BattleMutationContext, body: RevealParticipantBody): MutationResult {
  let order = ctx.participants;

  let pending = ctx.pending;

  const revealed: BattleParticipant[] = [];

  for (const id of body.participantIds) {
    const found = pending.find((p) => p.basicInfo.id === id && isReserved(p));

    if (!found) throw new BattleAccessError(404, API_ERRORS.BATTLE_RESERVE_NOT_FOUND);

    pending = pending.filter((p) => p !== found);

    const clean = dropBattleFlag(found, "reserved");

    const entering: BattleParticipant = { ...clean, battleData: { ...clean.battleData, revealPending: true } };

    order = insertAfterCurrent(order, ctx.scene.turnIndex, entering);
    revealed.push(entering);
  }

  const ids = new Set(revealed.map((p) => p.basicInfo.id));

  const joined = runAbilities(applyBakedAuras(order, ids), { type: "battleStart", newcomerIds: [...ids] }, { round: ctx.scene.round, rng: ctx.rng ?? Math.random });

  const participants = joined.participants.map((p) => (ids.has(p.basicInfo.id) ? { ...p, abilities: { ...p.abilities, initiative: calculateInitiative(p, joined.participants) } } : p));

  const names = revealed.map((p) => p.basicInfo.name).join(", ");

  return {
    participants,
    pending,
    events: [
      dmEvent(
        ctx.scene.round,
        `ДМ ввів у бій: ${names}${joined.messages.length > 0 ? `. ${joined.messages.join("; ")}` : ""}`,
        revealed.map((p) => ({ participantId: p.basicInfo.id, participantName: p.basicInfo.name })),
      ),
    ],
  };
}
