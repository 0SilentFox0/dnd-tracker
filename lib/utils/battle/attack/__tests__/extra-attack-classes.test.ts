import { describe, expect, it } from 'vitest';

import { attacksPerAction } from '../attacks-left';

import {
    makeParticipant,
    resolved,
} from '@/lib/utils/abilities/__tests__/fixtures';

const extra = (classId: string, id = 'a') =>
    resolved(
        {
            id,
            trigger: { event: 'passive' },
            effects: [{ kind: 'modifyStat', stat: 'attacksPerAction', flat: 1 }],
        } as never,
        { type: 'class', id: classId, name: classId }
    );

const item = resolved(
    {
        id: 'i',
        trigger: { event: 'passive' },
        effects: [{ kind: 'modifyStat', stat: 'attacksPerAction', flat: 1 }],
    } as never,
    { type: 'artifact', id: 'art', name: 'Blade' }
);

const count = (...abilities: ReturnType<typeof resolved>[]) => {
    const p = makeParticipant({ id: 'p', abilities });

    return attacksPerAction(p, [p]);
};

describe('attacksPerAction across classes', () => {
    it('does not stack Extra Attack from different classes', () => {
        expect(count(extra('fighter'), extra('paladin'))).toBe(1);
    });

    it('stacks within one class and takes the best class', () => {
        expect(
            count(extra('fighter'), extra('fighter', 'b'), extra('paladin'))
        ).toBe(2);
    });

    it('keeps non-class sources additive', () => {
        expect(count(extra('fighter'), extra('paladin'), item)).toBe(2);
    });
});
