import type { MitigateStep } from '@/lib/utils/rules/systems/types';
import type { DamageStep } from '@/types/battle-actions';

/** Running-total steps of a system's mitigation for the damage breakdown */
export function mitigatedSteps(steps: MitigateStep[]): DamageStep[] {
    let running = 0;

    return steps.map((s) => {
        running += s.value;

        return {
            label: s.label,
            side: s.side,
            kind: 'flat',
            value: s.value,
            after: running,
        };
    });
}
