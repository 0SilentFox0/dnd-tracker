import { z } from "zod";

import { BATTLE_SNAPSHOTS_KEPT_AFTER_COMPLETE, BattleStatus } from "@/lib/constants/battle";
import { prisma } from "@/lib/db";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import type { SnapshotState } from "@/lib/utils/battle/store";
import { BattleRuleError, loadSnapshotsFrom, restoreParticipantsAt } from "@/lib/utils/battle/store";

export const rollbackSchema = z.object({ actionIndex: z.number().int().min(1) });

type LoadSnapshots = (battleId: string, seq: number) => Promise<Array<{ seq: number; state: SnapshotState }>>;

type IsActiveEvent = (battleId: string, seq: number) => Promise<boolean>;

const defaultLoad: LoadSnapshots = (battleId, seq) => loadSnapshotsFrom(prisma, battleId, seq);

const defaultIsActiveEvent: IsActiveEvent = async (battleId, seq) =>
  (await prisma.battleEvent.count({ where: { battleId, seq, cancelledAt: null } })) > 0;

export function createRollbackMutation(load: LoadSnapshots = defaultLoad, isActiveEvent: IsActiveEvent = defaultIsActiveEvent) {
  return async (ctx: BattleMutationContext, body: z.infer<typeof rollbackSchema>): Promise<MutationResult> => {
    // повторний клік чи друга вкладка DM: скасовану подію не відкочуємо вдруге
    if (!(await isActiveEvent(ctx.scene.id, body.actionIndex))) {
      throw new BattleRuleError("action_rejected", "Цієї дії вже немає в журналі");
    }

    const snapshots = await load(ctx.scene.id, body.actionIndex);

    const [first] = snapshots;

    if (!first) {
      throw new BattleRuleError(
        "action_rejected",
        `Цю дію вже не відкотити: після завершення бою зберігаються лише останні ${BATTLE_SNAPSHOTS_KEPT_AFTER_COMPLETE} станів`,
      );
    }

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
        ...(scene.status !== BattleStatus.COMPLETED && { completedAt: null }),
      },
      events: [],
      history: { cancelFromSeq: first.seq },
    };
  };
}
