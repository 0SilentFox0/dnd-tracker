'use client';

import type { CriticalEffect } from '@/lib/constants/critical-effects';
import { useBattleScene } from '@/lib/hooks/battle';
import { critRulesOf } from '@/lib/utils/battle/attack/crit-rules';
import { enabledCritEffects } from '@/lib/utils/battle/crit-choice/catalog';
import { asShownCrit } from '@/lib/utils/battle/crit-choice/pending';
import type { CritTrigger } from '@/lib/utils/battle/crit-choice/types';
import { critChoiceOp } from '@/systems/d20/api/battle';

export interface CritChoiceRow {
    trigger: CritTrigger;
    actorName: string;
    targetName: string;
    options: readonly CriticalEffect[];
}

export function useCritChoiceDialog() {
    const { battle, viewer, actions } = useBattleScene();

    const crit = critRulesOf(battle.rules);

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
            actions.system.mutate(critChoiceOp({ choices })),
        cancel: () => actions.system.mutate(critChoiceOp({ cancel: true })),
        isSubmitting: actions.system.isPending,
    };
}
