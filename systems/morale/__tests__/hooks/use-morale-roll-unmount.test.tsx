// @vitest-environment happy-dom
import { useEffect } from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeScene } from '@/lib/hooks/battle/__tests__/fake-scene';
import { moraleDiceDone } from '@/lib/hooks/battle/morale-dice';
import { usePlayerTurn } from '@/lib/hooks/battle/usePlayerTurn';
import { TURN_SKIP_MS } from '@/lib/utils/battle/flows';
import { useMoraleRoll } from '@/systems/morale/hooks/useMoraleRoll';
import type { BattleParticipant } from '@/types/battle';

vi.mock('@/lib/hooks/battle/useFxEnabled', () => ({
    useFxEnabled: () => ({ enabled: true }),
}));

const outcome = (hasExtraTurn: boolean, shouldSkipTurn: boolean) => ({
    moraleResult: {
        hasExtraTurn,
        shouldSkipTurn,
        moralePositive: hasExtraTurn,
        message: '',
    },
});

let roll: ((d10: number) => Promise<void>) | undefined;

function Panel({
    hero,
    gate,
}: {
    hero: BattleParticipant;
    gate: ReturnType<typeof usePlayerTurn>['gate'];
}) {
    const morale = useMoraleRoll(hero, gate);

    useEffect(() => {
        roll = morale.roll;
    });

    return null;
}

// like MyTurnControls: the panel exists only in the gate phase
function Turn({ hero }: { hero: BattleParticipant }) {
    const turn = usePlayerTurn(hero);

    return turn.phase === 'gate' ? (
        <Panel hero={hero} gate={turn.gate} />
    ) : null;
}

describe('useMoraleRoll with the panel unmounting after gate.resolve', () => {
    beforeEach(() => vi.useFakeTimers());

    afterEach(() => vi.useRealTimers());

    it('extra: still shows the result once the dice settle', async () => {
        const scene = fakeScene({ morale: 2 });

        scene.moraleCheck.mockResolvedValue(outcome(true, false));

        render(<Turn hero={scene.me} />, { wrapper: scene.wrapper });

        let rolled: Promise<void> | undefined;

        await act(async () => {
            rolled = roll?.(9);
        });
        expect(scene.showResult).not.toHaveBeenCalled();

        await act(async () => {
            moraleDiceDone();
            await rolled;
        });
        expect(scene.showResult).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ outcome: 'extra' }),
            })
        );
    });

    it('skip: shows the result and passes the turn after TURN_SKIP_MS', async () => {
        const scene = fakeScene({ morale: -1 });

        scene.moraleCheck.mockResolvedValue(outcome(false, true));

        render(<Turn hero={scene.me} />, { wrapper: scene.wrapper });

        let rolled: Promise<void> | undefined;

        await act(async () => {
            rolled = roll?.(2);
        });

        await act(async () => {
            moraleDiceDone();
            await rolled;
        });
        expect(scene.showResult).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ outcome: 'skip' }),
            })
        );

        const { nextTurn } = scene.value.actions;

        expect(nextTurn.mutate).not.toHaveBeenCalled();

        await act(async () => {
            vi.advanceTimersByTime(TURN_SKIP_MS);
        });
        expect(nextTurn.mutate).toHaveBeenCalledTimes(1);
    });
});
