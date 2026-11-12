// @vitest-environment happy-dom
import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { fakeScene } from '../../../__tests__/fake-scene';
import { BattleSceneDataContext } from '../../../useBattleScene';
import { useMazeAsHeroValue } from '../useMazeView';

import { at, mazeMap } from '@/lib/utils/battle/modes/maze/__tests__/fixtures';

function setup() {
    const scene = fakeScene({ map: mazeMap({}, 8, 6) });

    const battle = {
        ...scene.battle,
        initiativeOrder: scene.battle.initiativeOrder?.map((p, i) =>
            at(p, { x: i, y: 0 })
        ),
    };

    let readOnly = true;

    const wrapper = ({ children }: { children: ReactNode }) => (
        <BattleSceneDataContext.Provider
            value={
                {
                    battle,
                    viewer: { userId: 'u', isDM: true, readOnly },
                } as never
            }
        >
            {children}
        </BattleSceneDataContext.Provider>
    );

    const hook = renderHook(() => useMazeAsHeroValue(), { wrapper });

    return {
        hook,
        leave: () => {
            readOnly = false;
            hook.rerender();
        },
    };
}

describe('useMazeAsHeroValue', () => {
    it('pins a hero in player view and resets the choice on exit', () => {
        const { hook, leave } = setup();

        expect(hook.result.current.id).toBe('me');

        act(() => hook.result.current.set('ally'));

        expect(hook.result.current.id).toBe('ally');

        leave();

        expect(hook.result.current.id).toBeNull();
    });
});
