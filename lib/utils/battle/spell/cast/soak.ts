import { getP, put } from '@/lib/utils/battle/common/action-flow';
import type { SpellCastState } from '@/lib/utils/battle/spell/cast/state';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type { MitigateResult } from '@/lib/utils/rules/systems/types';
import type { DamageStep } from '@/types/battle-actions';

export interface SpellSoak {
    amount: number;
    steps: DamageStep[];
    afterHit: MitigateResult['afterHit'];
}

/** The system's soak of one target's spell damage; undefined when the system has none for this spell */
export function soakSpellHit(
    state: SpellCastState,
    targetId: string,
    amount: number
): SpellSoak | undefined {
    const { flow, spell } = state;

    const result = ruleSystemOf(flow.ctx.rules).magic.soakSpellDamage?.({
        caster: getP(flow, state.caster.basicInfo.id),
        target: getP(flow, targetId),
        amount,
        spell,
        castDetails: state.castDetails,
        rules: flow.ctx.rules,
        rng: state.rng,
    });

    if (!result) return undefined;

    let running = 0;

    return {
        amount: result.amount,
        afterHit: result.afterHit,
        steps: result.steps.map((s) => {
            running += s.value;

            return {
                label: s.label,
                side: s.side,
                kind: 'flat',
                value: s.value,
                after: running,
            };
        }),
    };
}

export function applySoakAfterHit(
    state: SpellCastState,
    targetId: string,
    soak: SpellSoak | undefined
): void {
    if (!soak?.afterHit) return;

    const { flow } = state;

    const applied = soak.afterHit(getP(flow, targetId), flow.ctx.round);

    put(flow, applied.participant);
    flow.messages.push(applied.message);
}
