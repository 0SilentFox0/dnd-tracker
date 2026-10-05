import { z } from "zod";

import { prisma } from "@/lib/db";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import type { SnapshotState } from "@/lib/utils/battle/store";
import { BattleRuleError, loadSnapshotsFrom, restoreParticipantsAt } from "@/lib/utils/battle/store";

export const rollbackSchema = z.object({ actionIndex: z.number().int().min(1) });

type LoadSnapshots = (battleId: string, seq: number) => Promise<Array<{ seq: number; state: SnapshotState }>>;

const defaultLoad: LoadSnapshots = (battleId, seq) => loadSnapshotsFrom(prisma, battleId, seq);

export function createRollbackMutation(load: LoadSnapshots = defaultLoad) {
  return async (ctx: BattleMutationContext, body: z.infer<typeof rollbackSchema>): Promise<MutationResult> => {
    const snapshots = await load(ctx.scene.id, body.actionIndex);

    const [first] = snapshots;

    if (!first) throw new BattleRuleError("action_rejected", "Немає збереженого стану для відкату");

    const { participants, pending } = restoreParticipantsAt(snapshots, ctx);

    const { scene } = first.state;

    return {
      participants,
      pending,
      scene: {
        round: scene.round,
        turnIndex: scene.turnIndex,
        status: scene.status,
        pendingMoraleCheck: scene.pendingMoraleCheck,
        ...(scene.status !== "completed" && { completedAt: null }),
      },
      events: [],
      history: { cancelFromSeq: first.seq },
    };
  };
}
