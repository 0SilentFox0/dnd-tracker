import { skillTarget, value } from '../characteristics/derive';
import type { Characteristics } from '../characteristics/keys';
import type { QualityRef } from '../equipment/qualities';
import { DIFFICULTY_SL } from '../percentile/difficulty';

const GROUP_SPEC: Record<string, string> = { twohanded: 'two-handed' };

const BLACKPOWDER_FAMILY = ['blackpowder', 'explosives'];

const SIMPLE_RANGED = ['crossbow', 'throwing'];

export interface GroupUse {
    /** Test target; `undefined` keeps the characteristic */
    target?: number;
    noQualities: boolean;
    extraFlaws: QualityRef[];
    /** Difficulty SL cap: the test is at least this hard (p302) */
    slCap?: number;
    forbidden: boolean;
}

const specOf = (group: string) => GROUP_SPEC[group] ?? group;

const free: GroupUse = { noQualities: false, extraFlaws: [], forbidden: false };

/** Canon weapon group rules (p300-302): what a hero without Advances in the group may do with the weapon */
export function canonGroupUse(
    c: Characteristics,
    kind: 'melee' | 'ranged',
    group: string | undefined
): GroupUse {
    if (!group) return free;

    const spec = specOf(group);

    const own = skillTarget(c, kind, spec);

    if (!own) return free;

    if (kind === 'melee') {
        if (own.trained) return { ...free, target: own.target };

        const basic =
            group === 'fencing' ? skillTarget(c, 'melee', 'basic') : null;

        return {
            target: basic?.target ?? value(c, 'ws'),
            noQualities: true,
            extraFlaws: group === 'flail' ? [{ key: 'dangerous' }] : [],
            forbidden: false,
        };
    }

    if (own.advances > 0) return { ...free, target: own.target };

    const engineering = skillTarget(c, 'ranged', 'engineering');

    if (BLACKPOWDER_FAMILY.includes(group) && engineering?.advances)
        return { ...free, target: engineering.target };

    const blackpowder = skillTarget(c, 'ranged', 'blackpowder');

    if (group === 'engineering' && blackpowder?.advances)
        return {
            ...free,
            target: blackpowder.target,
            slCap: DIFFICULTY_SL.hard,
        };

    if (SIMPLE_RANGED.includes(group))
        return {
            ...free,
            target: value(c, 'bs'),
            slCap: DIFFICULTY_SL.difficult,
        };

    return { ...free, forbidden: true };
}

/** Two-handed Cavalry weapons count as Two-handed ones on foot (p300) */
export const footGroupOf = (group: string, twoHanded: boolean): string =>
    group === 'cavalry' && twoHanded ? 'twohanded' : group;
