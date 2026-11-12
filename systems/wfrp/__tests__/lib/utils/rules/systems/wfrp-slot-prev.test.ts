import { describe, expect, it } from 'vitest';

import { wfrpActionDetails } from '@/systems/wfrp/rules/combat/details';
import { WFRP_TESTED_MAGIC } from '@/systems/wfrp/rules/magic';
import { ACTION_SLOT } from '@/systems/wfrp/rules/slots';

const EXT = { homm: { note: 1 } };

const cast = {
    roll: 10,
    target: 40,
    sl: 2,
    cn: 1,
    channelled: 0,
    armourSl: 0,
    doubles: true,
    outcome: 'success',
    overcastSteps: 0,
    miscast: 'minor',
};

const withExt = (data: object) => ({
    key: 'wfrp',
    data: { ...data, ext: EXT },
});

describe('wfrp slot writes keep foreign ext', () => {
    it('redact keeps ext when it rewrites the slot', () => {
        const details = withExt({ cast });

        const out = wfrpActionDetails.redact?.(details, {
            hideActor: true,
            hideNumbers: false,
        } as never);

        expect((out?.data as { ext?: unknown }).ext).toEqual(EXT);
        expect(ACTION_SLOT.read(out)?.cast?.miscast).toBeNull();
    });

    it('avertMiscast keeps ext', () => {
        const out = WFRP_TESTED_MAGIC.avertMiscast(
            {
                miscast: 'minor',
                details: withExt({ cast }),
                lines: [],
            } as never,
            {} as never
        );

        expect((out?.details.data as { ext?: unknown }).ext).toEqual(EXT);
    });
});
