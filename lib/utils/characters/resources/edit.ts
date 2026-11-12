import { compactResources, withHp } from './hp';

import { isConsumablePool } from '@/lib/utils/items/pools';
import type { AbilityPool } from '@/types/battle';
import type { CharacterResources, ResourcesEditBody } from '@/types/characters';

export function editResources(
    r: CharacterResources,
    patch: ResourcesEditBody,
    maxHp?: number,
    pools: Record<
        string,
        Pick<AbilityPool, 'max' | 'rest'> & { regain?: number }
    > = {},
    opts?: { fateMax?: number }
): CharacterResources {
    if (patch.reset)
        return opts?.fateMax === undefined
            ? {}
            : compactResources({ fortune: opts.fateMax, sin: r.sin });

    let next: CharacterResources = { ...r };

    if (patch.tempHp !== undefined && opts?.fateMax === undefined)
        next.tempHp = patch.tempHp;

    if (patch.fortune !== undefined && opts?.fateMax !== undefined)
        next.fortune = Math.min(opts.fateMax, Math.max(0, patch.fortune));

    if (patch.sin !== undefined && opts?.fateMax !== undefined)
        next.sin = patch.sin;

    if (patch.exhaustion !== undefined) next.exhaustion = patch.exhaustion;

    if (patch.hp !== undefined)
        next =
            maxHp === undefined
                ? { ...next, hp: patch.hp }
                : withHp(next, patch.hp, maxHp);

    if (patch.dead === true)
        next = { ...next, dead: true, hp: 0, tempHp: undefined };

    if (patch.dead === false)
        next = { ...next, dead: undefined, ...(next.hp === 0 && { hp: 1 }) };

    if (patch.charges) {
        const charges = { ...next.charges };

        for (const [key, used] of Object.entries(patch.charges)) {
            const pool = pools[key];

            if (!pool || isConsumablePool(key)) continue;

            const n = Math.min(pool.max, Math.max(0, used));

            if (n === 0) delete charges[key];
            else
                charges[key] = {
                    used: n,
                    rest: pool.rest,
                    ...(pool.regain && { regain: pool.regain }),
                };
        }

        next = { ...next, charges };
    }

    return compactResources(next);
}
