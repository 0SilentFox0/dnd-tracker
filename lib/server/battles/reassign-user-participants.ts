import { defaultPipelineDeps } from './pipeline-deps';

import '@/lib/server/systems/registry';
import { BattleStatus } from '@/lib/constants/battle';
import { prisma } from '@/lib/db';
import { DEFAULT_LOCALE } from '@/lib/i18n/config';
import {
    reassignControllerMutation,
    reassignControllerSchema,
} from '@/lib/server/battles/mutations/reassign-controller/reassign-controller-mutation';
import {
    BattleAccess,
    type PipelineDeps,
    runGuardedBattleOperationCore,
} from '@/lib/utils/battle/pipeline/run-battle-mutation';

/** Hands every participant a user controls in unfinished battles to the campaign DM, one pipeline mutation per battle. */
export async function reassignUserParticipants(
    userId: string,
    pipeline: PipelineDeps = defaultPipelineDeps
): Promise<{ battleIds: string[]; failedBattleIds: string[] }> {
    const rows = await prisma.battleParticipant.findMany({
        where: {
            controlledBy: userId,
            battle: { status: { not: BattleStatus.COMPLETED } },
        },
        select: {
            battleId: true,
            battle: {
                select: {
                    campaignId: true,
                    campaign: { select: { dmUserId: true } },
                },
            },
        },
        distinct: ['battleId'],
    });

    const battleIds: string[] = [];

    const failedBattleIds: string[] = [];

    for (const { battleId, battle } of rows) {
        const campaignId = battle.campaignId;

        const dmUserId = battle.campaign.dmUserId;

        const run = () =>
            runGuardedBattleOperationCore(
                dmUserId,
                { userId },
                undefined,
                {
                    params: { id: campaignId, battleId },
                    operation: 'reassign-controller',
                    access: BattleAccess.DM,
                    allowWhileAwaitingDm: true,
                    allowWhileCritPending: true,
                    schema: reassignControllerSchema,
                    mutate: reassignControllerMutation,
                },
                pipeline,
                { logLocale: DEFAULT_LOCALE }
            );

        try {
            await (pipeline.withWrite
                ? pipeline.withWrite(campaignId, run)
                : run());
            battleIds.push(battleId);
        } catch (e) {
            failedBattleIds.push(battleId);
            console.error('[account-delete] battle reassign failed', {
                battleId,
                error: e instanceof Error ? e.name : 'unknown',
            });
        }
    }

    return { battleIds, failedBattleIds };
}
