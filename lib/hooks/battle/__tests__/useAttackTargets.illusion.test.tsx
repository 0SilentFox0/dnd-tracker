// @vitest-environment happy-dom
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';

import { fakeScene } from './fake-scene';

import { useAttackTargets } from '@/lib/hooks/battle/useAttackTargets';
import { emptyMaze } from '@/lib/utils/battle/modes/maze/constants';

afterEach(cleanup);

const maze = {
    ...emptyMaze(),
    illusionSwap: {
        pairs: [
            { a: 'me', b: 'ally', aSees: { name: 'X' }, bSees: { name: 'Y' } },
        ],
    },
};

const run = (pairs: boolean, attackerId: 'me' | 'third') => {
    const { wrapper, value, me, ally } = fakeScene({
        map: {
            cols: 8,
            rows: 8,
            background: null,
            opacity: 0.3,
            maze: pairs ? maze : emptyMaze(),
        },
    });

    const third = { ...ally, basicInfo: { ...ally.basicInfo, id: 'third' } };

    value.battle = { ...value.battle, initiativeOrder: [me, ally, third] };

    const attacker = attackerId === 'me' ? me : third;

    const { result } = renderHook(
        () =>
            useAttackTargets(attacker, attacker.battleData.attacks[0], 'pick'),
        { wrapper }
    );

    return result.current;
};

it('a paired hero sees the partner as an enemy target, an unpaired one does not', () => {
    expect(run(true, 'me').enemyTargets.map((p) => p.basicInfo.id)).toEqual([
        'ally',
    ]);
    expect(run(true, 'third').enemyTargets).toEqual([]);
    expect(run(false, 'me').enemyTargets).toEqual([]);
});

it('the partner is in targets for the paired hero but a bystander ally is not', () => {
    expect(run(true, 'me').targets.map((p) => p.basicInfo.id)).toEqual([
        'ally',
    ]);
    expect(run(true, 'third').targets.map((p) => p.basicInfo.id)).toEqual([]);
});
