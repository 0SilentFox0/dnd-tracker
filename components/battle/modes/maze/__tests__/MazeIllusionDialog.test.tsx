// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MazeIllusionDialog } from '@/components/battle/modes/maze/MazeIllusionDialog';
import { render } from '@/lib/i18n/test/render-uk';
import type { IllusionPair } from '@/types/battle';

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
];

async function pick(name: string, option: string) {
    fireEvent.pointerDown(screen.getByRole('combobox', { name }), {
        button: 0,
        ctrlKey: false,
        pointerType: 'mouse',
    });
    fireEvent.click(await screen.findByRole('option', { name: option }));
}

function setup(pairs: IllusionPair[] = []) {
    const onApply = vi.fn();

    const onClear = vi.fn();

    render(
        <MazeIllusionDialog
            open
            onOpenChange={() => {}}
            campaignId="c1"
            heroes={HEROES}
            pairs={pairs}
            onApply={onApply}
            onClear={onClear}
        />
    );

    return { onApply, onClear };
}

describe('MazeIllusionDialog', () => {
    it('«Застосувати» шле пару з масками обраних юнітів', async () => {
        const { onApply } = setup();

        fireEvent.click(screen.getByRole('button', { name: 'Додати' }));

        expect(
            (
                screen.getByRole('button', {
                    name: 'Застосувати',
                }) as HTMLButtonElement
            ).disabled
        ).toBe(true);

        await pick('Герой A', 'Аліса');
        await pick('Герой B', 'Боб');
        await pick('Як A бачить B', 'Орк');
        await pick('Як B бачить A', 'Ельф');

        fireEvent.click(screen.getByRole('button', { name: 'Застосувати' }));

        expect(onApply).toHaveBeenCalledWith([
            {
                a: 'h1',
                b: 'h2',
                aSees: { name: 'Орк', avatar: 'o.png', unitId: 'u1' },
                bSees: { name: 'Ельф', unitId: 'u2' },
            },
        ]);
    });

    it('героя вже обраного в парі, і того ж героя як B обрати не можна', async () => {
        setup();

        fireEvent.click(screen.getByRole('button', { name: 'Додати' }));

        await pick('Герой A', 'Аліса');

        fireEvent.pointerDown(
            screen.getByRole('combobox', { name: 'Герой B' }),
            { button: 0, ctrlKey: false, pointerType: 'mouse' }
        );

        const list = await screen.findByRole('listbox');

        expect(
            within(list)
                .getByRole('option', { name: 'Аліса' })
                .getAttribute('aria-disabled')
        ).toBe('true');
        expect(
            within(list)
                .getByRole('option', { name: 'Боб' })
                .getAttribute('aria-disabled')
        ).toBeNull();
    });

    it('активні пари показані з іменами героїв і масок; «Повернути союзників» викликає clear', () => {
        const pair: IllusionPair = {
            a: 'h1',
            b: 'h2',
            aSees: { name: 'Орк', unitId: 'u1' },
            bSees: { name: 'Ельф', unitId: 'u2' },
        };

        const { onClear } = setup([pair]);

        expect(
            screen.getByRole('combobox', { name: 'Герой A' }).textContent
        ).toContain('Аліса');
        expect(
            screen.getByRole('combobox', { name: 'Як A бачить B' }).textContent
        ).toContain('Орк');

        fireEvent.click(
            screen.getByRole('button', { name: 'Повернути союзників' })
        );

        expect(onClear).toHaveBeenCalled();
    });
});
