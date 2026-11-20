import { fortuneMax } from './characteristics/keys';
import { isFrenzied } from './traits/frenzy';
import { PARTICIPANT_SLOT } from './slots';
import { wfrpState, withWfrpState } from './state';

import { withAttacksLeft } from '@/lib/utils/battle/attack/attacks-left';
import type {
    PersistPart,
    StoredPart,
    TurnStateReset,
} from '@/lib/utils/rules/systems/types';

/** Fortune: the saved value, else its maximum; Fate: only once spent (absent = the characteristic) */
export const wfrpFromStored: StoredPart = (p, { stored }) => {
    const chars = PARTICIPANT_SLOT.read(p.abilities.system)?.characteristics;

    const fortune = stored.resources?.fortune ?? (chars && fortuneMax(chars));

    const fate = stored.resources?.fate;

    const sin = stored.resources?.sin;

    if (fortune === undefined && sin === undefined && fate === undefined)
        return p;

    return withWfrpState(p, {
        ...(fortune !== undefined && { fortune }),
        ...(fate !== undefined && { fate }),
        ...(sin !== undefined && { sin }),
    });
};

export const wfrpPersist: PersistPart = ({ participant }, acc) => ({
    resources: {
        ...acc.resources,
        fortune: wfrpState(participant).fortune ?? acc.resources.fortune,
        fate: wfrpState(participant).fate ?? acc.resources.fate,
    },
});

export const wfrpResetState: TurnStateReset = (p, scope) => {
    if (scope !== 'turn') return p;

    const { conditionTests, momentumAttack } = wfrpState(p);

    const cleared =
        conditionTests || momentumAttack
            ? withWfrpState(p, {
                  conditionTests: undefined,
                  momentumAttack: undefined,
              })
            : p;

    return isFrenzied(cleared) ? withAttacksLeft(cleared, 1) : cleared;
};
