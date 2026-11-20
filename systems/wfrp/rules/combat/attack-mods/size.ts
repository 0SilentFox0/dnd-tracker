import { sizeRangedSl } from '../../traits/size';
import { foesOnAttack, isOutnumbering, isSurrounded } from '../engagement';
import type { AttackModSource } from './types';

const SURROUNDED_SL = 2;

const OUTNUMBERED_SL = 1;

export const sizeMods: AttackModSource = ({ ctx, edition, kind }) => {
    const { attacker, target, participants, map } = ctx;

    if (kind === 'ranged')
        return edition.sizeModel === 'canon'
            ? [{ key: 'size', sl: sizeRangedSl(attacker, target) }]
            : [];

    const journal = edition.actionsModel === 'canon';

    if (isSurrounded(foesOnAttack(target, attacker, participants, map, journal)))
        return [{ key: 'surrounded', sl: SURROUNDED_SL }];

    return isOutnumbering(
        attacker,
        target,
        participants,
        map,
        edition.sizeModel === 'canon',
        journal
    )
        ? [{ key: 'outnumbered', sl: OUTNUMBERED_SL }]
        : [];
};
