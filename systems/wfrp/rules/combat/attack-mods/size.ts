import { sizeRangedSl } from '../../traits/size';
import { engagedFoes, isOutnumbering, isSurrounded } from '../engagement';
import type { AttackModSource } from './types';

const SURROUNDED_SL = 2;

const OUTNUMBERED_SL = 1;

export const sizeMods: AttackModSource = ({ ctx, edition, kind }) => {
    const { attacker, target, participants, map } = ctx;

    if (kind === 'ranged')
        return edition.sizeModel === 'canon'
            ? [{ key: 'size', sl: sizeRangedSl(attacker, target) }]
            : [];

    if (isSurrounded(engagedFoes(target, participants, map)))
        return [{ key: 'surrounded', sl: SURROUNDED_SL }];

    return isOutnumbering(
        attacker,
        target,
        participants,
        map,
        edition.sizeModel === 'canon'
    )
        ? [{ key: 'outnumbered', sl: OUTNUMBERED_SL }]
        : [];
};
