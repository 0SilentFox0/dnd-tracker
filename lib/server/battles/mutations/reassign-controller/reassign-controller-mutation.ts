import { z } from 'zod';

import { textRef } from '@/lib/i18n/text-ref';
import {
    reassignControlledBy,
    retargetPendingChoice,
} from '@/lib/utils/battle/participant/reassign-controller';
import type {
    BattleMutationContext,
    MutationResult,
} from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { dmEvent } from '@/lib/utils/battle/store';

export const reassignControllerSchema = z.object({
    userId: z.string().min(1),
});

export type ReassignControllerBody = z.infer<typeof reassignControllerSchema>;

export function reassignControllerMutation(
    ctx: BattleMutationContext,
    body: ReassignControllerBody
): MutationResult {
    const { participants, pending, reassigned } = reassignControlledBy(
        ctx.participants,
        ctx.pending,
        body.userId
    );

    const choice = retargetPendingChoice(
        ctx.scene.pendingChoice,
        body.userId,
        ctx.userId,
        new Set(reassigned.map((p) => p.basicInfo.id))
    );

    return {
        participants,
        pending,
        events: reassigned.map((p) =>
            dmEvent(
                ctx.scene.round,
                textRef('battleLog.dm.unitAssigned', {
                    unit: p.basicInfo.name,
                    who: textRef('battleLog.dm.name'),
                })
            )
        ),
        ...(choice !== ctx.scene.pendingChoice && {
            scene: { pendingChoice: choice },
        }),
    };
}
