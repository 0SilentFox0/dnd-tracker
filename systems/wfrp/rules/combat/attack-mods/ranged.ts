import { conditionLevel } from '../../conditions/levels';
import { wfrpState } from '../../state';
import { engagedFoes } from '../engagement';
import { RANGE_BAND_SL, rangeContext } from '../range-band';
import type { AttackMod, AttackModSource } from './types';

import { lineOfFire } from '@/lib/utils/battle/grid/line-of-fire';

const CALLED_SHOT_SL = -2;

/** Ranged SL by map weather, only what the book states (p166: fog -1, rain -2) */
export const WEATHER_SL: Partial<Record<string, number>> = {
    fog: -1,
    rain: -2,
};

export const calledShotMod = (spot: string | undefined): AttackMod[] =>
    spot ? [{ key: 'calledShot', sl: CALLED_SHOT_SL }] : [];

export const rangedMods: AttackModSource = ({ ctx, edition, kind, input }) => {
    if (kind !== 'ranged') return [];

    const { attacker, target, participants, map } = ctx;

    const mods: AttackMod[] = [...calledShotMod(input?.calledShot)];

    const range = rangeContext(ctx);

    if (range?.band && RANGE_BAND_SL[range.band] !== 0)
        mods.push({
            key: `range.${range.band}`,
            sl: RANGE_BAND_SL[range.band],
        });

    const covered =
        input?.cover || lineOfFire(map, participants, attacker, target).blocked;

    if (covered) mods.push({ key: 'cover', sl: -1 });
    else if (conditionLevel(target, 'prone') > 0)
        mods.push({ key: 'prone', sl: -1 });

    const weather = map?.weather ? (WEATHER_SL[map.weather] ?? 0) : 0;

    if (weather !== 0) mods.push({ key: 'weather', sl: weather });

    if (conditionLevel(target, 'surprised') > 0)
        mods.push({ key: 'surprised', sl: 1 });

    if (
        edition.actionsModel === 'canon' &&
        wfrpState(attacker).aim?.targetId === target.basicInfo.id
    )
        mods.push({ key: 'aim', sl: 1 });

    if ((attacker.battleData.movementUsed ?? 0) > 0)
        mods.push({ key: 'moved', sl: -1 });

    const others = engagedFoes(
        target,
        participants,
        map,
        edition.actionsModel === 'canon'
    ).filter((f) => f.basicInfo.id !== attacker.basicInfo.id);

    if (others.length > 0)
        mods.push({ key: 'shootingIntoMelee', sl: 0, disadvantage: 1 });

    return mods;
};
