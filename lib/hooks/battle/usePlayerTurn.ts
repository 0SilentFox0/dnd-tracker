'use client';

import { useEffect, useMemo, useReducer, useRef } from 'react';
import { useTranslations } from 'next-intl';

import { turnStartDue, turnStartOutcome } from './turn-start-check';
import { useBattleScene } from './useBattleScene';

import type { TurnGateControls } from '@/components/systems/types';
import { BattleStatus } from '@/lib/constants/battle';
import { useConfirm } from '@/lib/hooks/common';
import { coreActionsOn } from '@/lib/utils/battle/actions/access';
import { canAttackFromPool } from '@/lib/utils/battle/attack/attacks-left';
import {
    initialTurnFlow,
    TURN_SKIP_MS,
    turnFlow,
    type TurnGateOutcome,
} from '@/lib/utils/battle/flows';
import { checkReturnToStart } from '@/lib/utils/battle/grid';
import { canCastBonusSpell, turnExhausted } from '@/lib/utils/battle/view';
import type { BattleParticipant } from '@/types/battle';

type BonusSpell = Parameters<typeof canCastBonusSpell>[1][number];

export function usePlayerTurn(
    participant: BattleParticipant,
    bonusSpells: BonusSpell[] = []
) {
    const t = useTranslations('battle.notify');

    const scene = useBattleScene();

    const confirm = useConfirm();

    const [state, dispatch] = useReducer(turnFlow, initialTurnFlow, (s) =>
        turnFlow(s, {
            type: 'BEGIN',
            gated: turnStartDue(scene.battle, participant.basicInfo.id),
        })
    );

    const id = participant.basicInfo.id;

    const gateResult = state.gateResult ?? turnStartOutcome(scene.battle, id);

    const skipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const lifetime = useRef<AbortController | null>(null);

    useEffect(() => {
        const controller = new AbortController();

        lifetime.current = controller;

        return () => {
            if (skipTimer.current) clearTimeout(skipTimer.current);

            controller.abort();
        };
    }, []);

    const { map, initiativeOrder } = scene.battle;

    const canReturn =
        !!map &&
        !participant.battleData.reserved &&
        checkReturnToStart(map, initiativeOrder, participant).ok;

    const canReturnNow = () => {
        const latest = scene.readBattle();

        const me = latest?.initiativeOrder.find((p) => p.basicInfo.id === id);

        return (
            !!latest?.map &&
            !!me &&
            !me.battleData.reserved &&
            checkReturnToStart(latest.map, latest.initiativeOrder, me).ok
        );
    };

    const fresh = () =>
        scene
            .readBattle()
            ?.initiativeOrder.find((p) => p.basicInfo.id === id) ?? participant;

    const { mutate: move } = scene.actions.move;

    const returnToStart = () => {
        const to = participant.battleData.turnStartPosition;

        if (to) move({ participantId: id, to, returnToStart: true });
    };

    const endTurn = async () => {
        if (!participant.actionFlags.hasUsedAction && gateResult !== 'skip') {
            const ok = await confirm({
                title: t('endTurnTitle'),
                description: t('endTurnDescription'),
                confirmLabel: t('endTurnConfirm'),
                signal: lifetime.current?.signal,
            });

            if (!ok) return;
        }

        try {
            await scene.actions.nextTurn.mutateAsync({});
        } catch {
            return;
        }

        dispatch({ type: 'END' });
    };

    const actions = {
        afterAction: () => {
            if (scene.readBattle()?.status !== BattleStatus.ACTIVE) return;

            if (
                turnExhausted(fresh(), bonusSpells, scene.battle.rules, {
                    canReturn: canReturnNow(),
                    coreActions: coreActionsOn(scene.battle.rules),
                })
            )
                dispatch({ type: 'EXHAUSTED' });
        },
        stay: () => dispatch({ type: 'STAY' }),
        endTurn,
    };

    const wasReturnable = useRef(canReturn);

    useEffect(() => {
        const was = wasReturnable.current;

        wasReturnable.current = canReturn;

        if (was && !canReturn) actions.afterAction();
    });

    const strikeAndReturn = { available: canReturn, run: returnToStart };

    const sceneRef = useRef(scene);

    sceneRef.current = scene;

    const gate = useMemo<TurnGateControls>(
        () => ({
            get signal() {
                return lifetime.current?.signal;
            },
            resolve: (result: TurnGateOutcome) =>
                dispatch({ type: 'GATE_RESULT', result }),
            skipTurn: () => {
                const live = sceneRef.current;

                // версія фіксується одразу: якщо DM встигне передати хід сам, таймер отримає 409, а не пропустить наступного
                const expectedVersion = live.readBattle()?.version;

                skipTimer.current = setTimeout(
                    () =>
                        live.actions.nextTurn.mutate(
                            { expectedVersion },
                            { onError: () => dispatch({ type: 'RECOVER' }) }
                        ),
                    TURN_SKIP_MS
                );
            },
        }),
        []
    );

    return {
        phase: state.phase,
        gateResult,
        gate,
        status: {
            actionUsed: participant.actionFlags.hasUsedAction,
            attackLeft: canAttackFromPool(participant),
            bonusAvailable: !participant.actionFlags.hasUsedBonusAction,
            bonusSpellReady: canCastBonusSpell(participant, bonusSpells),
            skipped: gateResult === 'skip',
        },
        actions,
        strikeAndReturn,
    };
}
