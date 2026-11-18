'use client';

import { useCallback, useMemo } from 'react';

import { useBattleSceneData } from './useBattleScene';
import { useFxEnabled } from './useFxEnabled';
import { useSystemDice } from './useSystemDice';

import { ParticipantSide } from '@/lib/constants/battle';
import { usePageHidden } from '@/lib/hooks/common';
import {
    type FxImpact,
    impactFor,
    mapAction,
    MAX_FX_BATCH,
    MAX_FX_MS,
    splashTargetIds,
    type SystemFx,
} from '@/lib/utils/battle/fx';
import { DICE_TOTAL_MS } from '@/lib/utils/battle/fx/dice';
import type { BattleAction } from '@/types/battle-actions';

const FX_IMPACT_SLACK_MS = 1500;

function recentActions(log: BattleAction[]): BattleAction[] {
    return log
        .filter((a) => !a.isCancelled)
        .sort((a, b) => a.actionIndex - b.actionIndex)
        .slice(-MAX_FX_BATCH);
}

export function useFxImpacts(
    fx?: SystemFx
): (participantId: string) => FxImpact | null {
    const { battle } = useBattleSceneData();

    const log = battle.battleLog;

    const { initiativeOrder, redacted } = battle;

    const systemDice = useSystemDice(fx).length;

    const { enabled } = useFxEnabled();

    const hidden = usePageHidden();

    const impacts = useMemo(() => {
        const result = new Map<string, FxImpact | null>();

        if (!enabled) return result;

        const actions = recentActions(log).map((action) => {
            const specs = mapAction(action);

            return {
                action,
                main: specs.find((s) => s.archetype !== 'dice'),
                dice: specs.filter((s) => s.archetype === 'dice').length,
            };
        });

        // the safety timer covers everything queued from this action to the end of the window (dice, animations, system dice)
        const waitFrom = (from: number) => {
            const rest = actions.slice(from);

            const dice = rest.reduce((sum, a) => sum + a.dice, 0);

            return (
                dice * DICE_TOTAL_MS +
                rest.length * MAX_FX_MS +
                FX_IMPACT_SLACK_MS +
                systemDice * DICE_TOTAL_MS
            );
        };

        const projected = new Set(
            redacted
                ? initiativeOrder
                      .filter((p) => p.basicInfo.side !== ParticipantSide.ALLY)
                      .map((p) => p.basicInfo.id)
                : []
        );

        const deltaOf = (action: BattleAction, id: string) =>
            -action.hpChanges
                .filter((h) => h.participantId === id)
                .reduce((sum, h) => sum + h.change, 0);

        actions.forEach(({ action, main }, i) => {
            for (const id of [
                ...(main?.targetIds ?? []),
                ...splashTargetIds(action, main),
            ]) {
                const impact = impactFor(
                    main && { ...main, targetIds: [id] },
                    id
                );

                const delta = projected.has(id) ? deltaOf(action, id) : 0;

                // hidden tab = FX queue inactive: show without waiting for the signal
                if (impact)
                    result.set(id, {
                        ...impact,
                        ...(delta !== 0 && { delta }),
                        ...(!hidden && {
                            actionId: action.id,
                            waitMs: waitFrom(i),
                        }),
                    });
            }
        });

        return result;
    }, [log, enabled, systemDice, hidden, initiativeOrder, redacted]);

    return useCallback(
        (participantId: string) => impacts.get(participantId) ?? null,
        [impacts]
    );
}
