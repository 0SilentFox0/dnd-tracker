import {
    FLIER_SHOOTER_SL,
    SWARM_RANGED_SL,
} from '../../traits/constants';
import { isFlier, isSwarm } from '../../traits/creature';
import type { AttackModSource } from './types';

export const traitMods: AttackModSource = ({ ctx, edition, kind }) => {
    if (edition.traitModel !== 'canon' || kind !== 'ranged') return [];

    return [
        ...(isSwarm(ctx.target)
            ? [{ key: 'swarm', sl: SWARM_RANGED_SL }]
            : []),
        ...(isFlier(ctx.attacker)
            ? [{ key: 'flierShooter', sl: FLIER_SHOOTER_SL }]
            : []),
    ];
};
