import type { ParticipantPart } from '@/lib/utils/rules/systems/types';

export const moraleCapPart: ParticipantPart<object> = (p, { rules }) => ({
    ...p,
    combatStats: {
        ...p.combatStats,
        moraleCap: rules.morale.enabled ? rules.morale.cap : 0,
    },
});
