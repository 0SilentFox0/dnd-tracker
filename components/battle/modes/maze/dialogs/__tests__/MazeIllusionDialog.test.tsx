// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MazeIllusionDialog } from '@/components/battle/modes/maze/dialogs/MazeIllusionDialog';
import { render } from '@/lib/i18n/test/render-uk';
import type { IllusionGroup } from '@/types/battle-grid';

vi.unmock('next-intl');

vi.mock('@/lib/hooks/units', () => ({
    useUnitPicker: () => ({
        raceOptions: [{ key: 'r', label: 'Раса', count: 2 }],
        raceKey: 'r',
        selectRace: () => {},
        tiers: [
            {
                level: 1,
                units: [
                    { id: 'u1', name: 'Орк', avatar: 'o.png' },
                    { id: 'u2', name: 'Ельф', avatar: null },
                ],
            },
        ],
        unitId: '',
        setUnitId: () => {},
        reset: () => {},
    }),
}));

Object.assign(Element.prototype, {
    hasPointerCapture: () => false,
    releasePointerCapture: () => {},
    setPointerCapture: () => {},
    scrollIntoView: () => {},
});

afterEach(cleanup);

const HEROES = [
    { id: 'h1', name: 'Аліса' },
    { id: 'h2', name: 'Боб' },
    { id: 'h3', name: 'Карл' },
    { id: 'h4', name: 'Дана' },
];

async function pick(name: string, option: string) {
    fireEvent.pointerDown(screen.getByRole('combobox', { name }), {
        button: 0,
        ctrlKey: false,
        pointerType: 'mouse',
    });
    fireEvent.click(await screen.findByRole('option', { name: option }));
}

function setup(groups: IllusionGroup[] = []) {
    const onApply = vi.fn();

    const onClear = vi.fn();

    render(
        <MazeIllusionDialog
            open
            onOpenChange={() => {}}
            campaignId="c1"
            heroes={HEROES}
            groups={groups}
            onApply={onApply}
            onClear={onClear}
        />
    );

    return { onApply, onClear };
}

async function addHero(group: number, member: number, name: string) {
    await pick(`Герой ${group}.${member}`, name);
}

async function addDisguise(
    group: number,
    member: number,
    hero: string,
    unit: string
) {
    const label = `Маска ${hero} · #${group}`;

    await pick(label, unit);
}

describe('MazeIllusionDialog', () => {
    it('creates one group of three heroes with a disguise per hero', async () => {
        const { onApply } = setup();

        fireEvent.click(screen.getByRole('button', { name: 'Додати 1' }));
        await addHero(1, 1, 'Аліса');
        fireEvent.click(screen.getByRole('button', { name: 'Додати (1)' }));
        await addHero(1, 2, 'Боб');
        fireEvent.click(screen.getByRole('button', { name: 'Додати (1)' }));
        await addHero(1, 3, 'Карл');
        await addDisguise(1, 1, 'Аліса', 'Орк');
        await addDisguise(1, 2, 'Боб', 'Ельф');
        await addDisguise(1, 3, 'Карл', 'Орк');
        fireEvent.click(screen.getByRole('button', { name: 'Застосувати' }));

        expect(onApply).toHaveBeenCalledWith([
            {
                heroes: [
                    {
                        id: 'h1',
                        disguise: {
                            name: 'Орк',
                            unitId: 'u1',
                            avatar: 'o.png',
                        },
                    },
                    { id: 'h2', disguise: { name: 'Ельф', unitId: 'u2' } },
                    {
                        id: 'h3',
                        disguise: {
                            name: 'Орк',
                            unitId: 'u1',
                            avatar: 'o.png',
                        },
                    },
                ],
            },
        ]);
    });

    it('allows the same hero in different overlapping groups', async () => {
        const { onApply } = setup();

        fireEvent.click(screen.getByRole('button', { name: 'Додати 1' }));
        await addHero(1, 1, 'Аліса');
        fireEvent.click(screen.getByRole('button', { name: 'Додати (1)' }));
        await addHero(1, 2, 'Боб');
        await addDisguise(1, 1, 'Аліса', 'Орк');
        await addDisguise(1, 2, 'Боб', 'Ельф');
        fireEvent.click(screen.getByRole('button', { name: 'Додати 2' }));
        await addHero(2, 1, 'Аліса');
        fireEvent.click(screen.getByRole('button', { name: 'Додати (2)' }));
        await addHero(2, 2, 'Карл');
        await addDisguise(2, 1, 'Аліса', 'Ельф');
        await addDisguise(2, 2, 'Карл', 'Орк');
        fireEvent.click(screen.getByRole('button', { name: 'Застосувати' }));

        expect(onApply.mock.calls[0]?.[0]).toHaveLength(2);
    });

    it('keeps saved groups visible and clear restores allies', () => {
        const group: IllusionGroup = {
            heroes: [
                { id: 'h1', disguise: { name: 'Орк', unitId: 'u1' } },
                { id: 'h2', disguise: { name: 'Ельф', unitId: 'u2' } },
                { id: 'h3', disguise: { name: 'Орк', unitId: 'u1' } },
            ],
        };

        const { onClear } = setup([group]);

        expect(
            screen.getByRole('combobox', { name: 'Герой 1.1' })
        ).toHaveTextContent('Аліса');
        fireEvent.click(
            screen.getByRole('button', { name: 'Повернути союзників' })
        );
        expect(onClear).toHaveBeenCalled();
    });
});
