// @vitest-environment happy-dom
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/hud/fonts', () => ({ hudFontClassName: '' }));

import { ActionResultCard } from '@/components/battle/overlays/ActionResultCard';
import { CornerStack } from '@/components/battle/scene/CornerStack';
import {
    MapStripSlotContext,
    NoticeStackContext,
} from '@/components/battle/scene/MapStrip';
import { ACTION_RESULT_MS } from '@/lib/hooks/battle';
import { fakeScene } from '@/lib/hooks/battle/__tests__/fake-scene';
import type {
    PercentileAttackDetails,
    PercentileCastDetails,
} from '@/systems/wfrp/rules/percentile/details';
import { ACTION_SLOT } from '@/systems/wfrp/rules/slots';
import type { ActionResultFx } from '@/types/battle-scene';

const atk = (attack: PercentileAttackDetails) => ACTION_SLOT.write({ attack });

const cst = (cast: PercentileCastDetails) => ACTION_SLOT.write({ cast });

vi.unmock('next-intl');

const card = () => screen.getByRole('status', { name: 'Результат дії' });

describe('ActionResultCard', () => {
    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    it.each<[ActionResultFx, string[]]>([
        [
            {
                kind: 'hit',
                targetName: 'Циклоп',
                damage: 10,
                downed: true,
                d20: 14,
            },
            ['Влучання', 'Циклоп · повалений', '−10'],
        ],
        [
            {
                kind: 'crit',
                targetName: 'Циклоп',
                damage: 24,
                downed: false,
                d20: 20,
                critEffect: {
                    name: 'Безкоштовна атака',
                    flavor: 'Вихор сталі',
                },
            },
            ['Критичне влучання', '−24', 'Безкоштовна атака', 'Вихор сталі'],
        ],
        [
            { kind: 'miss', targetName: 'Гоблін', d20: 13, known: '≥ 14' },
            ['Промах', 'Гоблін · d20 13 · AC ≥ 14'],
        ],
        [
            {
                kind: 'miss',
                targetName: 'Гоблін',
                d20: 1,
                known: '?',
                critFail: { name: 'Падіння', flavor: 'Ви спотикаєтесь.' },
            },
            ['Критична невдача', 'Падіння'],
        ],
        [
            {
                kind: 'hit',
                targetName: 'Циклоп',
                damage: 10,
                downed: false,
                d20: 14,
                retaliation: { name: 'Циклоп', damage: 4 },
            },
            ['Відповідь цілі: Циклоп −4'],
        ],
        [
            {
                kind: 'hit',
                targetName: 'Гоблін',
                damage: 15,
                downed: false,
                d20: 14,
                strikes: [
                    {
                        targetName: 'Гоблін',
                        kind: 'hit',
                        damage: 9,
                        downed: false,
                    },
                    {
                        targetName: 'Орк',
                        kind: 'miss',
                        damage: 0,
                        downed: false,
                    },
                    {
                        targetName: 'Біс',
                        kind: 'crit',
                        damage: 6,
                        downed: true,
                    },
                ],
            },
            ['Гоблін', '−9', 'Орк', 'промах', 'Біс', 'крит −6 · повалений'],
        ],
        [
            {
                kind: 'hit',
                targetName: 'Циклоп',
                damage: 6,
                downed: false,
                d20: 30,
                system: atk({
                    roll: 30,
                    target: 45,
                    sl: 1,
                    netSl: 3,
                    location: 'arm',
                    doubles: false,
                    defender: { kind: 'parry', roll: 60, sl: -2, target: 40 },
                    momentumUsed: true,
                }),
                exact: true,
            },
            [
                'Кидок 30 проти 45',
                'РУ 1 · захист -2 · чистий 3',
                'Локація: рука',
                'Momentum витрачено',
                'Momentum отримано',
            ],
        ],
        [
            {
                kind: 'miss',
                targetName: 'Гоблін',
                d20: 80,
                known: '?',
                system: atk({
                    roll: 80,
                    target: 45,
                    sl: -1,
                    netSl: -1,
                    location: 'head',
                    doubles: false,
                }),
            },
            ['Кидок 80 проти 45', 'РУ -1'],
        ],
        [
            {
                kind: 'spell',
                spellName: 'Вогняна куля',
                changes: [
                    { name: 'Гоблін', change: 12 },
                    { name: 'Годрік', change: -5 },
                ],
                targetCount: 2,
            },
            ['Вогняна куля', 'Гоблін', '−12', 'Годрік', '+5'],
        ],
        [
            {
                kind: 'spell',
                spellName: 'Благословення',
                changes: [],
                targetCount: 3,
            },
            ['Благословення', 'Застосовано · цілей: 3'],
        ],
        [
            {
                kind: 'spell',
                spellName: 'Іскра',
                changes: [{ name: 'Гоблін', change: 4 }],
                targetCount: 1,
                system: cst({
                    roll: 20,
                    target: 50,
                    sl: 3,
                    cn: 3,
                    channelled: 2,
                    armourSl: 0,
                    doubles: false,
                    outcome: 'success',
                    overcastSteps: 1,
                    miscast: null,
                }),
            },
            [
                'Каст вдався',
                '20 / 50 · РУ 3 проти СН 3',
                'Накопичено +2 РУ',
                'Оверкаст ×1',
                '−4',
            ],
        ],
        [
            {
                kind: 'spell',
                spellName: 'Іскра',
                changes: [],
                targetCount: 1,
                system: cst({
                    roll: 44,
                    target: 40,
                    sl: -1,
                    cn: 3,
                    channelled: 0,
                    armourSl: 0,
                    doubles: true,
                    outcome: 'failure',
                    overcastSteps: 0,
                    miscast: 'minor',
                }),
            },
            [
                'Каст не вдався',
                '44 / 40 · РУ -1 проти СН 3',
                'Малий збій магії',
            ],
        ],
    ])('%o', (fx, parts) => {
        const { wrapper } = fakeScene({
            result: fx,
            system: 'system' in fx && fx.system ? 'wfrp' : undefined,
        });

        render(<ActionResultCard />, { wrapper });

        for (const part of parts) expect(card().textContent).toContain(part);
    });

    it('d100: Momentum отримано видно й коли захисника сховано (не-exact ціль)', () => {
        const { wrapper } = fakeScene({
            system: 'wfrp',
            result: {
                kind: 'hit',
                targetName: 'Циклоп',
                damage: 6,
                downed: false,
                d20: 30,
                system: atk({
                    roll: 30,
                    target: 45,
                    sl: 3,
                    netSl: 3,
                    location: 'arm',
                    doubles: false,
                    opposed: true,
                }),
            },
        });

        render(<ActionResultCard />, { wrapper });

        expect(card().textContent).toContain('Momentum отримано');
        expect(card().textContent).not.toContain('захист');
    });

    it('d100: не-exact ціль ховає захисника, SL = чистий результат', () => {
        const attack = {
            roll: 30,
            target: 45,
            sl: 1,
            netSl: 3,
            location: 'arm',
            doubles: false,
            defender: { kind: 'parry', roll: 60, sl: -2, target: 40 },
        } as const;

        const { wrapper } = fakeScene({
            system: 'wfrp',
            result: {
                kind: 'hit',
                targetName: 'Циклоп',
                damage: 6,
                downed: false,
                d20: 30,
                system: atk(attack),
            },
        });

        render(<ActionResultCard />, { wrapper });

        expect(card().textContent).toContain('РУ 3');
        expect(card().textContent).not.toContain('захист');
    });

    it('d100 без захисника не показує «захист» і промах без локації', () => {
        const { wrapper } = fakeScene({
            system: 'wfrp',
            result: {
                kind: 'miss',
                targetName: 'Гоблін',
                d20: 80,
                known: '?',
                system: atk({
                    roll: 80,
                    target: 45,
                    sl: -1,
                    netSl: -1,
                    location: 'head',
                    doubles: false,
                }),
            },
        });

        render(<ActionResultCard />, { wrapper });

        expect(card().textContent).not.toContain('захист');
        expect(card().textContent).not.toContain('Локація');
        expect(card().textContent).not.toContain('d20');
    });

    it('wfrp: промах без percentile-даних не падає в d20-вигляд', () => {
        const { wrapper } = fakeScene({
            system: 'wfrp',
            result: { kind: 'miss', targetName: 'Гоблін', d20: 80, known: '?' },
        });

        render(<ActionResultCard />, { wrapper });

        expect(card().textContent).toContain('Гоблін');
        expect(card().textContent).not.toContain('d20');
        expect(card().textContent).not.toContain('AC');
    });

    it('мораль — не для картки', () => {
        const { wrapper } = fakeScene({
            result: { kind: 'morale-extra', name: 'Фрейда', d10: 9, morale: 2 },
        });

        render(<ActionResultCard />, { wrapper });

        expect(screen.queryByRole('status')).toBeNull();
    });

    it('не модальна: без затемнення на весь екран; на десктопі — у кутовому стовпчику', () => {
        const { wrapper } = fakeScene({
            result: {
                kind: 'hit',
                targetName: 'Циклоп',
                damage: 10,
                downed: false,
                d20: 14,
            },
        });

        render(
            <CornerStack>
                <ActionResultCard />
            </CornerStack>,
            { wrapper }
        );

        expect(card().className).not.toContain('inset-0');
        expect(card().className).not.toContain('fixed');
        expect(card().className).toContain('w-[300px]');
    });

    it('на телефоні з картою стає в смугу під картою', () => {
        const slot = document.createElement('div');

        const { wrapper } = fakeScene({
            result: {
                kind: 'hit',
                targetName: 'Циклоп',
                damage: 10,
                downed: false,
                d20: 14,
            },
        });

        render(
            <MapStripSlotContext value={slot}>
                <ActionResultCard />
            </MapStripSlotContext>,
            { wrapper }
        );

        expect(slot.querySelector('[role=status]')).toBeTruthy();
    });

    it('на телефоні поза картою — у стовпчику повідомлень разом із тостом, а не поверх нього', () => {
        const stack = document.createElement('div');

        const { wrapper } = fakeScene({
            result: {
                kind: 'hit',
                targetName: 'Циклоп',
                damage: 10,
                downed: false,
                d20: 14,
            },
        });

        render(
            <NoticeStackContext value={stack}>
                <ActionResultCard />
            </NoticeStackContext>,
            { wrapper }
        );

        const placed = stack.querySelector<HTMLElement>('[role=status]');

        expect(placed).toBeTruthy();
        expect(placed?.className).not.toContain('fixed');
    });

    it('зникає сама за ~4 с, кліком чи кнопкою «Закрити»', () => {
        vi.useFakeTimers();

        const a = fakeScene({
            result: {
                kind: 'hit',
                targetName: 'Циклоп',
                damage: 10,
                downed: false,
                d20: 14,
            },
        });

        render(<ActionResultCard />, { wrapper: a.wrapper });
        act(() => vi.advanceTimersByTime(ACTION_RESULT_MS - 100));
        expect(a.showResult).not.toHaveBeenCalled();
        act(() => vi.advanceTimersByTime(200));
        expect(a.showResult).toHaveBeenCalledWith(null);
        cleanup();

        const b = fakeScene({
            result: {
                kind: 'spell',
                spellName: 'Вогняна куля',
                changes: [],
                targetCount: 0,
            },
        });

        render(<ActionResultCard />, { wrapper: b.wrapper });
        fireEvent.click(screen.getByRole('button', { name: 'Закрити' }));
        expect(b.showResult).toHaveBeenCalledWith(null);
    });
});
