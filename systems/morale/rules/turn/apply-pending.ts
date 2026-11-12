import { ParticipantSide } from '@/lib/constants/battle';
import { textRef } from '@/lib/i18n/text-ref';
import {
    findParticipant,
    updateParticipant,
} from '@/lib/utils/abilities/engine/core/participants';
import { newBattleAction } from '@/lib/utils/battle/common/new-action';
import { lineText, logFields } from '@/lib/utils/battle/log/lines';
import { effectiveMorale } from '@/lib/utils/battle/morale/effective-morale';
import type { PendingMoraleCheckPayload } from '@/lib/utils/battle/morale/threshold';
import type { Ruleset } from '@/lib/utils/rules';
import type {
    RunAbilities,
    TurnAdvanceCtx,
    TurnHook,
} from '@/lib/utils/rules/systems/types';
import type { BattleAction, BattleParticipant } from '@/types/battle';

export interface ApplyPendingMoraleResult {
    updatedInitiativeOrder: BattleParticipant[];
    moraleLogEntry: BattleAction;
}

export interface ApplyPendingMoraleInput {
    participants: BattleParticipant[];
    payload: PendingMoraleCheckPayload;
    scene: { round: number; id: string; eventSeq: number };
    rng?: () => number;
    rules: Ruleset;
    run: RunAbilities;
}

export function applyPendingMoraleCheck({
    participants: initiativeOrder,
    payload,
    scene,
    rng = Math.random,
    rules,
    run: runAbilities,
}: ApplyPendingMoraleInput): ApplyPendingMoraleResult {
    const {
        round: currentRound,
        id: battleId,
        eventSeq: battleLogLength,
    } = scene;

    const { participantId, d10Roll, moraleResult } = payload;

    const participant = findParticipant(initiativeOrder, participantId);

    if (!participant) {
        return {
            updatedInitiativeOrder: initiativeOrder,
            moraleLogEntry: {
                id: `morale-skip-${Date.now()}`,
                battleId,
                round: currentRound,
                actionIndex: battleLogLength,
                timestamp: new Date(),
                actorId: participantId,
                actorName: '?',
                actorSide: ParticipantSide.ALLY,
                actionType: 'ability',
                targets: [],
                actionDetails: { d10Roll, morale: 0 },
                ...logFields(textRef('battleLog.morale.notFound')),
                hpChanges: [],
                isCancelled: false,
                stateBefore: undefined,
            },
        };
    }

    // без клона: учасник ходить ще раз наприкінці раунду (advanceTurn); з додаткового ходу — не ланцюжком
    const grantsExtraTurn =
        moraleResult.hasExtraTurn &&
        !participant.battleData.extraTurnActive &&
        !participant.battleData.airborne;

    let updatedInitiativeOrder =
        grantsExtraTurn || moraleResult.shouldSkipTurn
            ? updateParticipant(initiativeOrder, participantId, (p) => ({
                  ...p,
                  actionFlags: {
                      ...p.actionFlags,
                      ...(grantsExtraTurn && { hasExtraTurn: true }),
                      // паніка: до власного наступного ходу не відповідає на удари (скидання — на початку ходу)
                      ...(moraleResult.shouldSkipTurn && {
                          hasUsedReaction: true,
                      }),
                  },
              }))
            : initiativeOrder;

    const moraleSuccess =
        moraleResult.hasExtraTurn || !moraleResult.shouldSkipTurn;

    const run = runAbilities(
        updatedInitiativeOrder,
        {
            type: 'moraleCheck',
            actorId: participant.basicInfo.id,
            result: moraleSuccess ? 'success' : 'fail',
        },
        { round: currentRound, rng, rules }
    );

    updatedInitiativeOrder = run.participants;

    const triggerMessages = run.messages;

    const participantForLog = findParticipant(
        updatedInitiativeOrder,
        participantId
    );

    const moraleLogEntry = newBattleAction(
        participant,
        moraleResult.shouldSkipTurn ? 'morale_skip' : 'ability',
        { battleId, round: currentRound },
        {
            id: `morale-${participant.basicInfo.id}-${Date.now()}`,
            actionIndex: battleLogLength,
            actionDetails: {
                d10Roll,
                morale: effectiveMorale(
                    participantForLog ?? participant,
                    updatedInitiativeOrder
                ).value,
            },
            ...logFields(
                lineText(
                    [moraleResult.message, ...triggerMessages].filter(Boolean),
                    ' | '
                )
            ),
        }
    );

    return { updatedInitiativeOrder, moraleLogEntry };
}

export const applyPendingMorale: TurnHook<TurnAdvanceCtx> = ({
    participants,
    scene,
    rules,
    run,
}) => {
    if (!scene.pendingMoraleCheck) return { participants, messages: [] };

    const morale = applyPendingMoraleCheck({
        participants,
        payload: scene.pendingMoraleCheck as PendingMoraleCheckPayload,
        scene,
        rules,
        run,
    });

    return {
        participants: morale.updatedInitiativeOrder,
        messages: [],
        actions: morale.moraleLogEntry ? [morale.moraleLogEntry] : [],
    };
};
