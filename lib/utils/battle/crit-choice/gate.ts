import {
    type DisabledCrits,
    enabledCritEffects,
    randomCritEffect,
} from './catalog';
import type {
    CritPicker,
    CritTrigger,
    RiderOffer,
    RiderPicker,
} from './types';

import { heldRider } from '@/lib/utils/battle/d20-rider/held';
import { rollDie } from '@/lib/utils/common/dice';
import type { Rng } from '@/lib/utils/common/rng';

export interface SpentRider {
    holderId: string;
    effectId: string;
}

export function createCritGate(opts: {
    rng: Rng;
    choices?: Record<string, number>;
    disabled?: DisabledCrits;
    riderChoices?: Record<string, boolean>;
}): {
    pick: CritPicker;
    triggers: CritTrigger[];
    offers: RiderOffer[];
    spent: SpentRider[];
} {
    const triggers: CritTrigger[] = [];

    const offers: RiderOffer[] = [];

    const spent: SpentRider[] = [];

    const riderSeen = new Map<string, number>();

    const seen = new Map<string, number>();

    const pick: CritPicker = (info) => {
        const random = randomCritEffect(
            info.source,
            info.kind,
            opts.rng,
            opts.disabled
        );

        const base = `${info.source}:${info.actorId}:${info.targetId}`;

        const n = seen.get(base) ?? 0;

        seen.set(base, n + 1);

        const key = `${base}:${n}`;

        triggers.push({ ...info, key });

        const chosen = opts.choices?.[key];

        return (
            (chosen !== undefined &&
                enabledCritEffects(info.source, info.kind, opts.disabled).find(
                    (e) => e.id === chosen
                )) ||
            random
        );
    };

    const rider: RiderPicker = (info) => {
        const held = heldRider(info.holder);

        if (
            !held ||
            info.total >= info.needed ||
            info.total + held.die < info.needed
        )
            return undefined;

        const holderId = info.holder.basicInfo.id;

        const base = `rider:${holderId}:${info.kind}`;

        const n = riderSeen.get(base) ?? 0;

        riderSeen.set(base, n + 1);

        const key = `${base}:${n}`;

        const bonus = rollDie(held.die, opts.rng);

        offers.push({
            key,
            holderId,
            kind: info.kind,
            die: held.die,
            total: info.total,
        });

        if (!opts.riderChoices?.[key]) return undefined;

        spent.push({ holderId, effectId: held.effectId });

        return { bonus, die: held.die };
    };

    return { pick: Object.assign(pick, { rider }), triggers, offers, spent };
}
