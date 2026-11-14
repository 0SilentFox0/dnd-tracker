import { z } from 'zod';

import {
    type CharacterRow,
    defaultRefreshDeps,
    type RefreshSourcesDeps,
} from '../refresh-sources/refresh-sources-mutation';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { ParticipantSourceType } from '@/lib/constants/battle';
import { textRef } from '@/lib/i18n/text-ref';
import {
    findParticipant,
    isActive,
    updateParticipant,
} from '@/lib/utils/abilities/engine/core/participants';
import { canActNow, currentOf } from '@/lib/utils/battle/common/control';
import { logFields } from '@/lib/utils/battle/log/lines';
import { refreshFromSource } from '@/lib/utils/battle/participant/refresh-from-source';
import type {
    BattleMutationContext,
    MutationResult,
} from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { BattleAccessError, BattleRuleError } from '@/lib/utils/battle/store';
import { REJECT } from '@/lib/utils/battle/store/reject';
import { assertCanAct } from '@/lib/utils/battle/turn';

export const swapGearSchema = z.object({ participantId: z.string().min(1) });

export type SwapGearBody = z.infer<typeof swapGearSchema>;

/** Герой у свій хід переносить зміни екіпіювання з листа в бій за бонусну дію. */
export function createSwapGearMutation(
    deps: Pick<
        RefreshSourcesDeps,
        'loadCharacter' | 'fromCharacter' | 'buildContext'
    > = defaultRefreshDeps
) {
    return async (
        ctx: BattleMutationContext,
        data: SwapGearBody
    ): Promise<MutationResult> => {
        const hero = findParticipant(ctx.participants, data.participantId);

        if (!hero)
            throw new BattleAccessError(
                404,
                API_ERRORS.BATTLE_PARTICIPANT_NOT_IN_BATTLE
            );

        if (!canActNow(ctx, hero, currentOf(ctx)))
            throw new BattleAccessError(403, API_ERRORS.FORBIDDEN);

        if (!isActive(hero))
            throw new BattleRuleError('participant_dead', REJECT.cannotAct);

        assertCanAct(ctx, hero.basicInfo.id);

        if (hero.actionFlags.hasUsedBonusAction)
            throw new BattleRuleError('action_used', REJECT.bonusActionUsed);

        const { sourceType, sourceId, side, instanceNumber } = hero.basicInfo;

        if (sourceType !== ParticipantSourceType.CHARACTER)
            throw new BattleAccessError(403, API_ERRORS.FORBIDDEN);

        const row = await deps.loadCharacter(sourceId);

        if (!row || row.campaignId !== ctx.scene.campaignId)
            throw new BattleAccessError(404, API_ERRORS.NOT_FOUND);

        const campaignContext = await deps.buildContext(ctx.scene.campaignId, [
            row as CharacterRow,
        ]);

        const fresh = await deps.fromCharacter(
            row,
            ctx.scene.id,
            side,
            instanceNumber,
            campaignContext,
            { rules: ctx.meta.rules }
        );

        const participants = updateParticipant(
            ctx.participants,
            hero.basicInfo.id,
            (live) => {
                const next = refreshFromSource(live, fresh);

                return {
                    ...next,
                    combatStats: {
                        ...next.combatStats,
                        armorClass: fresh.combatStats.armorClass,
                    },
                    actionFlags: {
                        ...next.actionFlags,
                        hasUsedBonusAction: true,
                    },
                };
            }
        );

        const text = logFields(
            textRef('battleLog.gear.swapped', { name: hero.basicInfo.name })
        );

        return {
            participants,
            pending: ctx.pending,
            events: [
                {
                    type: 'ability',
                    round: ctx.scene.round,
                    actorId: hero.basicInfo.id,
                    ...text,
                    details: {
                        actorName: hero.basicInfo.name,
                        actorSide: hero.basicInfo.side,
                        ...(text.log && { log: text.log }),
                    },
                },
            ],
        };
    };
}

export const swapGearMutation = createSwapGearMutation();
