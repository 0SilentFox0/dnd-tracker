import './ext-codec';
import type { PersistPart, StoredPart } from '@/lib/utils/rules/systems/types';
import { d20State, withD20State } from '@/systems/d20/rules/state';

/** Inspiration comes into the battle only as `true` */
export const inspirationFromStored: StoredPart = (p, { stored, rules }) =>
    rules.outOfCombat.inspiration && stored.inspiration === true
        ? withD20State(p, { inspiration: true })
        : p;

export const inspirationPersist: PersistPart = ({ participant, rules }, acc) =>
    rules.outOfCombat.inspiration && d20State(participant).inspirationSpent
        ? { ...acc, clearInspiration: true }
        : acc;
