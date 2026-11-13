'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

import type { TurnGateControls } from '@/components/systems/types';
import {
    afterMoraleDice,
    useBattleScene,
    useFxEnabled,
} from '@/lib/hooks/battle';
import { usePageHidden } from '@/lib/hooks/common';
import { effectiveMorale } from '@/lib/utils/battle/morale/effective-morale';
import { moraleOutcome } from '@/systems/morale/rules/turn/outcome';
import type { BattleParticipant } from '@/types/battle';

export function useMoraleRoll(
    participant: BattleParticipant,
    gate: TurnGateControls
) {
    const t = useTranslations('battle.notify');

    const scene = useBattleScene();

    const fx = useFxEnabled();

    const hidden = usePageHidden();

    const fxActive = fx.enabled && !hidden;

    const lifetime = useRef<AbortController | null>(null);

    useEffect(() => {
        const controller = new AbortController();

        lifetime.current = controller;

        return () => controller.abort();
    }, []);

    const roll = async (d10: number) => {
        let res;

        try {
            res = await scene.actions.moraleCheck.mutateAsync({
                participantId: participant.basicInfo.id,
                d10Roll: d10,
            });
        } catch {
            return;
        }

        const result = moraleOutcome(res?.moraleResult);

        gate.resolve(result);

        const base = {
            name: participant.basicInfo.name,
            d10,
            morale: effectiveMorale(
                participant,
                scene.readBattle()?.initiativeOrder ?? []
            ).value,
        };

        if (fxActive && result !== 'none') {
            const signal = lifetime.current?.signal;

            await afterMoraleDice(signal);

            if (signal?.aborted) return;
        }

        if (result === 'extra')
            scene.result.show({ kind: 'morale-extra', ...base });
        else if (result === 'skip') {
            scene.result.show({ kind: 'morale-skip', ...base });

            gate.skipTurn();
        } else
            scene.toast.show(
                t('moraleUnchanged', { name: participant.basicInfo.name, d10 })
            );
    };

    return { roll };
}
