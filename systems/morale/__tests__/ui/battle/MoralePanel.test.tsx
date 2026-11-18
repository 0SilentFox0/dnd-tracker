// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fakeScene } from '@/lib/hooks/battle/__tests__/fake-scene';
import { moraleTriggerRolls } from '@/systems/morale/rules/trigger-rolls';
import { MoraleLabel } from '@/systems/morale/ui/battle/MoraleLabel';
import { MoralePanel } from '@/systems/morale/ui/battle/MoralePanel';

const roll = vi.hoisted(() => vi.fn());

vi.mock('@/systems/morale/hooks/useMoraleRoll', () => ({
    useMoraleRoll: () => ({ roll }),
}));
vi.mock('@/lib/utils/common/dice', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/utils/common/dice')>()),
    rollDie: () => 7,
}));

const gate = { resolve: vi.fn(), skipTurn: vi.fn() };

describe('MoralePanel', () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('shows the skip-turn hint with the trigger rolls for negative morale', () => {
        const scene = fakeScene({ morale: -2 });

        const { kind, rolls } = moraleTriggerRolls(scene.me, [scene.me]);

        render(<MoralePanel hero={scene.me} gate={gate} />, {
            wrapper: scene.wrapper,
        });

        expect(kind).toBe('skip');
        expect(
            screen.getByText(
                `battleMorale.skipOn ${JSON.stringify({ rolls: rolls.join(', ') })}`
            )
        ).toBeTruthy();
    });

    it('shows the extra-turn hint for positive morale', () => {
        const scene = fakeScene({ morale: 3 });

        render(<MoralePanel hero={scene.me} gate={gate} />, {
            wrapper: scene.wrapper,
        });

        expect(screen.getByText(/^battleMorale.extraOn/)).toBeTruthy();
    });

    it('shows no hint for zero morale', () => {
        const scene = fakeScene({ morale: 0 });

        render(<MoralePanel hero={scene.me} gate={gate} />, {
            wrapper: scene.wrapper,
        });

        expect(screen.queryByText(/battleMorale.(skipOn|extraOn)/)).toBeNull();
    });

    it('picking a die rolls that value; the AI button rolls a random d10', () => {
        const scene = fakeScene({ morale: 0 });

        render(<MoralePanel hero={scene.me} gate={gate} />, {
            wrapper: scene.wrapper,
        });

        expect(screen.getAllByRole('button', { name: /^\d+$/ })).toHaveLength(
            10
        );

        fireEvent.click(screen.getByRole('button', { name: '4' }));

        expect(roll).toHaveBeenLastCalledWith(4);

        fireEvent.click(screen.getByRole('button', { name: /battle.hud/ }));

        expect(roll).toHaveBeenLastCalledWith(7);
    });
});

describe('MoraleLabel', () => {
    afterEach(cleanup);

    it('shows the strip text without an outcome and the outcome text with one', () => {
        const first = render(<MoraleLabel />);

        expect(first.container.textContent).toBe('battleMorale.strip');
        first.unmount();

        const second = render(<MoraleLabel outcome="skip" />);

        expect(second.container.textContent).toBe('battleMorale.outcome.skip');
    });
});
