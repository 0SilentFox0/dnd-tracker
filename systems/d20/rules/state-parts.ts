import { d20State, withD20State } from './state';

import type {
    PersistPart,
    StoredPart,
    TurnStateReset,
} from '@/lib/utils/rules/systems/types';

/** Inspiration comes into the battle only as `true` */
export const d20FromStored: StoredPart = (p, { stored, rules }) =>
    rules.outOfCombat.inspiration && stored.inspiration === true
        ? withD20State(p, { inspiration: true })
        : p;

export const d20Persist: PersistPart = ({ participant, rules }, acc) =>
    rules.outOfCombat.inspiration && d20State(participant).inspirationSpent
        ? { ...acc, clearInspiration: true }
        : acc;

export const d20ResetState: TurnStateReset = (p, scope) =>
    scope === 'turn' && d20State(p).attackedWithLight
        ? withD20State(p, { attackedWithLight: undefined })
        : p;
