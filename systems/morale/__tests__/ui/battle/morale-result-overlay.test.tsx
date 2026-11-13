// @vitest-environment happy-dom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/hud/fonts', () => ({ hudFontClassName: '' }));

import { fakeScene } from '@/lib/hooks/battle/__tests__/fake-scene';
import { moraleResultFx } from '@/systems/morale/rules/result-fx';
import { MoraleResultOverlay } from '@/systems/morale/ui/battle/MoraleResultOverlay';

vi.unmock('next-intl');

const extra = moraleResultFx({
    outcome: 'extra',
    name: 'Фрейда',
    d10: 9,
    morale: 2,
});

const skip = moraleResultFx({
    outcome: 'skip',
    name: 'Фрейда',
    d10: 2,
    morale: -1,
});

describe('MoraleResultOverlay', () => {
    afterEach(cleanup);

    it.each([
        [extra, 'Бойовий дух', 'додатковий хід'],
        [skip, 'Паніка', 'втрачає хід'],
    ])('%o', (fx, title, detail) => {
        const { wrapper } = fakeScene({ result: fx });

        render(<MoraleResultOverlay />, { wrapper });

        expect(screen.getByText(title)).toBeTruthy();
        expect(screen.getByText(new RegExp(detail))).toBeTruthy();
    });

    it('атаки й заклинання не займають екран — їх показує кутова картка', () => {
        const { wrapper } = fakeScene({
            result: {
                kind: 'hit',
                targetName: 'Циклоп',
                damage: 10,
                downed: false,
                d20: 14,
            },
        });

        const { container } = render(<MoraleResultOverlay />, { wrapper });

        expect(container.innerHTML).toBe('');
    });

    it('чужий системний результат або зіпсовані дані — порожньо', () => {
        const foreign = fakeScene({
            result: { kind: 'system', module: 'other', data: {} },
        });

        const broken = fakeScene({
            result: { kind: 'system', module: 'morale', data: { d10: 1 } },
        });

        for (const { wrapper } of [foreign, broken]) {
            const { container } = render(<MoraleResultOverlay />, { wrapper });

            expect(container.innerHTML).toBe('');
            cleanup();
        }
    });

    it('паніка закривається сама через 4 с', () => {
        vi.useFakeTimers();

        const { wrapper, showResult } = fakeScene({ result: skip });

        render(<MoraleResultOverlay />, { wrapper });
        act(() => vi.advanceTimersByTime(4_100));
        expect(showResult).toHaveBeenCalledWith(null);

        vi.useRealTimers();
    });
});
