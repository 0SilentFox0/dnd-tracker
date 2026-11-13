import { PARTICIPANT_SLOT } from './slots';
import { wfrpState, withWfrpState } from './state';

import type {
    PersistPart,
    StoredPart,
    TurnStateReset,
} from '@/lib/utils/rules/systems/types';

/** Fortune: the saved value, else the Fate characteristic */
export const wfrpFromStored: StoredPart = (p, { stored }) => {
    const fortune =
        stored.resources?.fortune ??
        PARTICIPANT_SLOT.read(p.abilities.system)?.characteristics.fate;

    const sin = stored.resources?.sin;

    if (fortune === undefined && sin === undefined) return p;

    return withWfrpState(p, {
        ...(fortune !== undefined && { fortune }),
        ...(sin !== undefined && { sin }),
    });
};

export const wfrpPersist: PersistPart = ({ participant }, acc) => ({
    resources: {
        ...acc.resources,
        fortune: wfrpState(participant).fortune ?? acc.resources.fortune,
    },
});

export const wfrpResetState: TurnStateReset = (p, scope) =>
    scope === 'turn' && wfrpState(p).conditionTests
        ? withWfrpState(p, { conditionTests: undefined })
        : p;
