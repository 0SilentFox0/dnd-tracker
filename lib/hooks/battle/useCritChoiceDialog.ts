'use client';

import { useBattleScene } from './useBattleScene';

import type { CriticalEffect } from '@/lib/constants/critical-effects';
import { enabledCritEffects } from '@/lib/utils/battle/crit-choice/catalog';
import { asShownCrit } from '@/lib/utils/battle/crit-choice/pending';
import type { CritTrigger } from '@/lib/utils/battle/crit-choice/types';
import { DEFAULT_RULES } from '@/lib/utils/rules';

export interface CritChoiceRow {
    trigger: CritTrigger;
    actorName: string;
    targetName: string;
    options: readonly CriticalEffect[];
}

export function useCritChoiceDialog() {
    const { battle, viewer, actions } = useBattleScene();

    const crit = (battle.rules ?? DEFAULT_RULES).criticals;

    const pending = asShownCrit(battle.pendingChoice);

    const nameOf = (id: string) =>
        battle.initiativeOrder.find((p) => p.basicInfo.id === id)?.basicInfo
            .name ?? '';

    const rows: CritChoiceRow[] = (pending?.triggers ?? []).map((trigger) => ({
        trigger,
        actorName: nameOf(trigger.actorId),
        targetName: nameOf(trigger.targetId),
        options: enabledCritEffects(trigger.source, trigger.kind, {
            success: crit.disabledSuccess,
            fail: crit.disabledFail,
        }),
    }));

    return {
        open: viewer.isDM && pending !== null,
        rows,
        submit: (choices: Record<string, number | 'random'>) =>
            actions.critChoice.mutate({ choices }),
        cancel: () => actions.critChoice.mutate({ cancel: true }),
        isSubmitting: actions.critChoice.isPending,
    };
}
