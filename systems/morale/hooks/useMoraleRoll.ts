'use client';

import { useTranslations } from 'next-intl';

import type { TurnGateControls } from '@/components/systems/types';
import {
    afterMoraleDice,
    useBattleScene,
    useFxEnabled,
} from '@/lib/hooks/battle';
import { usePageHidden } from '@/lib/hooks/common';
import { effectiveMorale } from '@/lib/utils/battle/morale/effective-morale';
import { moraleResultFx } from '@/systems/morale/rules/result-fx';
import { moraleOutcome } from '@/systems/morale/rules/turn/outcome';
import type { BattleParticipant } from '@/types/battle';

export function useMoraleRoll(
    participant: BattleParticipant,
    gate: TurnGateControls
) {
    const t = useTranslations('battleMorale');

    const scene = useBattleScene();

    const fx = useFxEnabled();

    const hidden = usePageHidden();

    const fxActive = fx.enabled && !hidden;

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
            const { signal } = gate;

            await afterMoraleDice(signal);

            if (signal?.aborted) return;
        }

        if (result === 'extra')
            scene.result.show(moraleResultFx({ outcome: result, ...base }));
        else if (result === 'skip') {
            scene.result.show(moraleResultFx({ outcome: result, ...base }));

            gate.skipTurn();
        } else
            scene.toast.show(
                t('unchanged', { name: participant.basicInfo.name, d10 })
            );
    };

    return { roll };
}
