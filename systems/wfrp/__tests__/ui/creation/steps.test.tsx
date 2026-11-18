// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { render } from '@/lib/i18n/test/render-uk';
import { CareerStep } from '@/systems/wfrp/ui/creation/CareerStep';
import { SpeciesStep } from '@/systems/wfrp/ui/creation/SpeciesStep';
import { StatsStep } from '@/systems/wfrp/ui/creation/StatsStep';
import { TalentsStep } from '@/systems/wfrp/ui/creation/TalentsStep';
import type { WfrpDraftFormState } from '@/systems/wfrp/ui/creation/types';

vi.unmock('next-intl');

vi.mock('@/components/ui/select-field', () => ({
    SelectField: (p: {
        'aria-label'?: string;
        value: string;
        onValueChange: (v: string) => void;
        options: { value: string; label: string }[];
    }) => (
        <select
            aria-label={p['aria-label']}
            value={p.value}
            onChange={(e) => p.onValueChange(e.target.value)}
        >
            <option value="" />
            {p.options.map((o) => (
                <option key={o.value} value={o.value}>
                    {o.label}
                </option>
            ))}
        </select>
    ),
}));

afterEach(cleanup);

const shown = (_key: string, v: unknown) => String(v);

const form = (over: Record<string, unknown>) =>
    ({
        shown,
        xp: undefined,
        step: { id: 'x', total: 5 },
        ...over,
    }) as never as WfrpDraftFormState;

describe('CareerStep', () => {
    const career = (over: object = {}) => ({
        mode: 'choice',
        setMode: vi.fn(),
        rolls: [],
        roll: vi.fn(),
        careerId: null,
        pick: vi.fn(),
        all: [{ id: 'c1', name: 'Воїн' }],
        ...over,
    });

    it('offers a roll button until something is rolled', () => {
        const c = career();

        render(<CareerStep form={form({ career: c, careerName: String })} />);
        fireEvent.click(screen.getByRole('button', { name: "Кинути кар'єру" }));

        expect(c.roll).toHaveBeenCalled();
    });

    it('dedupes rolled careers in choice mode and picks on click', () => {
        const c = career({
            rolls: [
                { careerId: 'a', roll: 10 },
                { careerId: 'a', roll: 20 },
                { careerId: 'b', roll: 30 },
            ],
        });

        render(
            <CareerStep
                form={form({
                    career: c,
                    careerName: (id: string) => `N-${id}`,
                })}
            />
        );

        const group = screen.getByRole('radiogroup', { name: "Кар'єра" });

        const cards = within(group).getAllByRole('radio');

        expect(cards).toHaveLength(2);

        fireEvent.click(cards[1]);

        expect(c.pick).toHaveBeenCalledWith('b');
    });

    it('rolled mode shows only the first roll and the final notice', () => {
        const c = career({
            mode: 'rolled',
            rolls: [
                { careerId: 'a', roll: 10 },
                { careerId: 'b', roll: 30 },
            ],
        });

        render(
            <CareerStep
                form={form({
                    career: c,
                    careerName: (id: string) => `N-${id}`,
                })}
            />
        );

        expect(screen.getByText('N-a')).toBeTruthy();
        expect(screen.queryByText('N-b')).toBeNull();
        expect(screen.getByText(/зафіксована/)).toBeTruthy();
    });

    it('free mode picks from all careers and shows xp bonus on modes', () => {
        const c = career({ mode: 'free' });

        render(
            <CareerStep
                form={form({
                    career: c,
                    careerName: String,
                    xp: { careerBonus: { rolled: 50, choice: 25, free: 0 } },
                })}
            />
        );
        fireEvent.change(screen.getByLabelText("Кар'єра"), {
            target: { value: 'c1' },
        });

        expect(c.pick).toHaveBeenCalledWith('c1');
        expect(screen.getByText('Кидок (+50 досвіду)')).toBeTruthy();
    });
});

describe('TalentsStep', () => {
    const talents = (over: object = {}) => ({
        fixed: [],
        count: 0,
        rolled: [],
        roll: vi.fn(),
        names: (id: string) => `T-${id}`,
        ...over,
    });

    it('shows empty states when there are no fixed or random talents', () => {
        render(<TalentsStep form={form({ talents: talents() })} />);

        expect(screen.getByText('Вид не дає постійних талантів.')).toBeTruthy();
        expect(
            screen.getByText('Для цього виду випадкових талантів немає.')
        ).toBeTruthy();
    });

    it('lists fixed talents and rolls the random ones', () => {
        const t = talents({ fixed: ['f1', 'f2'], count: 3 });

        render(<TalentsStep form={form({ talents: t })} />);

        expect(screen.getByText('T-f1')).toBeTruthy();
        expect(screen.getByText('Випадкові таланти (3)')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Кинути таланти' }));

        expect(t.roll).toHaveBeenCalled();
    });

    it('hides the roll button once talents are rolled', () => {
        const t = talents({ count: 2, rolled: ['r1', 'r2'] });

        render(<TalentsStep form={form({ talents: t })} />);

        expect(
            screen.queryByRole('button', { name: 'Кинути таланти' })
        ).toBeNull();
        expect(screen.getByText('T-r2')).toBeTruthy();
    });
});

describe('SpeciesStep', () => {
    const species = (over: object = {}) => ({
        data: [],
        selected: null,
        select: vi.fn(),
        loading: false,
        ...over,
    });

    const talentsApi = { names: (id: string) => `T-${id}` };

    it('renders loading and not-ready states', () => {
        const { rerender } = render(
            <SpeciesStep
                form={form({
                    species: species({ loading: true }),
                    talents: talentsApi,
                })}
            />
        );

        expect(screen.getByText('Завантажуємо види…')).toBeTruthy();

        rerender(
            <SpeciesStep
                form={form({ species: species(), talents: talentsApi })}
            />
        );

        expect(screen.getByText('Види ще не готові')).toBeTruthy();
    });

    it('shows mods and talents per species and selects on click', () => {
        const s = species({
            selected: 'r1',
            data: [
                {
                    race: { id: 'r1', name: 'Людина' },
                    profile: {
                        mods: { ws: 5, bs: -5, s: 0 },
                        move: 4,
                        fate: 2,
                        extraWounds: 1,
                        talents: ['t1'],
                    },
                },
                {
                    race: { id: 'r2', name: 'Ельф' },
                    profile: {
                        mods: {},
                        move: 5,
                        fate: 0,
                        extraWounds: 0,
                        talents: [],
                    },
                },
            ],
        });

        render(
            <SpeciesStep form={form({ species: s, talents: talentsApi })} />
        );

        expect(screen.getByText(/Рух 4 · Доля 2/)).toBeTruthy();
        expect(screen.getByText('Таланти: T-t1')).toBeTruthy();
        expect(screen.getByText('Бонуси: без бонусів')).toBeTruthy();

        const [human, elf] = screen.getAllByRole('radio');

        expect(human.getAttribute('aria-checked')).toBe('true');

        fireEvent.click(elf);

        expect(s.select).toHaveBeenCalledWith('r2');
    });
});

describe('StatsStep', () => {
    const stats = (over: object = {}) => ({
        mode: 'rolled',
        setMode: vi.fn(),
        rolls: [],
        roll: vi.fn(),
        arranged: [],
        swap: vi.fn(),
        points: [],
        setPoint: vi.fn(),
        budget: 100,
        ...over,
    });

    const ten = Array.from({ length: 10 }, (_, i) => i + 1);

    it('asks for a roll when nothing is rolled', () => {
        const s = stats();

        render(<StatsStep form={form({ stats: s })} />);
        fireEvent.click(
            screen.getByRole('button', { name: 'Кинути характеристики' })
        );

        expect(s.roll).toHaveBeenCalled();
        expect(screen.queryByRole('list')).toBeNull();
    });

    it('rearranged mode swaps neighbours and disables edge arrows', () => {
        const s = stats({ mode: 'rearranged', rolls: ten, arranged: ten });

        render(<StatsStep form={form({ stats: s, profile: undefined })} />);

        const ups = screen.getAllByRole('button', { name: /Підняти вище/ });

        const downs = screen.getAllByRole('button', { name: /Опустити нижче/ });

        expect((ups[0] as HTMLButtonElement).disabled).toBe(true);
        expect((downs[9] as HTMLButtonElement).disabled).toBe(true);

        fireEvent.click(ups[3]);
        fireEvent.click(downs[3]);

        expect(s.swap).toHaveBeenNthCalledWith(1, 3, 2);
        expect(s.swap).toHaveBeenNthCalledWith(2, 3, 4);
    });

    it('free mode shows spent budget and commits clamped point edits', () => {
        const s = stats({ mode: 'free', points: ten });

        render(<StatsStep form={form({ stats: s, profile: undefined })} />);

        expect(screen.getByRole('status').textContent).toBe(
            'Розподілено 55 з 100'
        );

        const input = screen.getAllByRole('textbox')[0];

        fireEvent.change(input, { target: { value: '7' } });

        expect(s.setPoint).toHaveBeenCalledWith(0, 7);
    });

    it('adds species mods to the displayed total', () => {
        const s = stats({ rolls: ten });

        render(
            <StatsStep
                form={form({
                    stats: s,
                    profile: { mods: { ws: 10 } },
                })}
            />
        );

        expect(screen.getByTestId('stat-ws').textContent).toBe('1');
        expect(screen.getAllByText('Разом 31')).toHaveLength(1);
    });
});
