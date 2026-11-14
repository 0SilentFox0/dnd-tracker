// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTurnTimer } from '../useTurnTimer';

import { BattleStatus } from '@/lib/constants/battle';

const mutate = vi.fn();

const STARTED = new Date(Date.now() - 120_000).toISOString();

let seq = 0;

let scene: ReturnType<typeof makeScene>;

const makeScene = (
    over: Record<string, unknown> = {},
    battleId = `b${seq}`
) => ({
    campaignId: 'c',
    battleId,
    battle: {
        version: 1,
        status: BattleStatus.ACTIVE,
        turnTimerSeconds: 60,
        turnStartedAt: STARTED,
        currentTurnIndex: 0,
        pendingChoice: null,
        ...over,
    },
    viewer: { isDM: true, userId: 'u' },
    turn: { current: { basicInfo: { controlledBy: 'dm' } } },
    anyPending: false,
});

vi.mock('../useBattleScene', () => ({ useBattleScene: () => scene }));

vi.mock('@/lib/hooks/battles', () => ({ useNextTurn: () => ({ mutate }) }));

describe('useTurnTimer', () => {
    beforeEach(() => {
        mutate.mockReset();
        seq += 1;
        scene = makeScene();
    });

    it('sends next-turn once for an expired turn despite version bumps and remounts', () => {
        const first = renderHook(() => useTurnTimer());

        scene = makeScene({ version: 2 });
        first.rerender();
        first.unmount();

        renderHook(() => useTurnTimer());

        expect(mutate).toHaveBeenCalledTimes(1);
    });

    it('sends again for the next expired turn', () => {
        const hook = renderHook(() => useTurnTimer());

        scene = makeScene({
            currentTurnIndex: 1,
            turnStartedAt: new Date(Date.now() - 90_000).toISOString(),
        });
        hook.rerender();

        expect(mutate).toHaveBeenCalledTimes(2);
    });
});
