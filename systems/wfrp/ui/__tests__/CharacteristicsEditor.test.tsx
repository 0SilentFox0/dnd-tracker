// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CharacteristicsEditor } from '../CharacteristicsEditor';

import { render } from '@/lib/i18n/test/render-uk';
import type { SectionBinding } from '@/lib/utils/characters/form/bindings';
import {
    type Characteristics,
    DEFAULT_CHARACTERISTICS,
} from '@/systems/wfrp/rules/characteristics/keys';

vi.unmock('next-intl');

const setup = (over: Partial<Characteristics> = {}, withExtras?: boolean) => {
    const set = vi.fn();

    const data: Characteristics = {
        ...DEFAULT_CHARACTERISTICS,
        base: { ...DEFAULT_CHARACTERISTICS.base, ws: 30 },
        advances: { ...DEFAULT_CHARACTERISTICS.advances, ws: 4 },
        ...over,
    };

    render(
        <CharacteristicsEditor
            binding={
                { data, set } as unknown as SectionBinding<Characteristics>
            }
            withExtras={withExtras}
        />
    );

    return { set, data };
};

const commit = (el: HTMLElement, value: string) => {
    fireEvent.change(el, { target: { value } });
    fireEvent.blur(el);
};

describe('CharacteristicsEditor', () => {
    afterEach(cleanup);

    it('shows the total as base plus advances', () => {
        setup();
        expect(screen.getByText('34')).toBeInTheDocument();
    });

    it('commits a base change keeping the other characteristics', () => {
        const { set, data } = setup();

        commit(document.getElementById('char-base-ws')!, '41');
        expect(set).toHaveBeenLastCalledWith('base', { ...data.base, ws: 41 });
    });

    it('commits an advances change into the advances map', () => {
        const { set, data } = setup();

        commit(document.getElementById('char-adv-ws')!, '7');
        expect(set).toHaveBeenLastCalledWith('advances', {
            ...data.advances,
            ws: 7,
        });
    });

    it('commits move, fate and extra wounds as top-level fields', () => {
        const { set } = setup();

        commit(document.getElementById('char-move')!, '5');
        expect(set).toHaveBeenLastCalledWith('move', 5);
        commit(document.getElementById('char-fate')!, '2');
        expect(set).toHaveBeenLastCalledWith('fate', 2);
        commit(document.getElementById('char-extra-wounds')!, '1');
        expect(set).toHaveBeenLastCalledWith('extraWounds', 1);
    });

    it('commits Fortune max and clears it when emptied', () => {
        const { set } = setup();

        fireEvent.change(document.getElementById('char-fortune')!, {
            target: { value: '5' },
        });
        expect(set).toHaveBeenLastCalledWith('fortune', 5);
    });

    it('clears Fortune max when emptied', () => {
        const { set } = setup({ fortune: 5 });

        fireEvent.change(document.getElementById('char-fortune')!, {
            target: { value: '' },
        });
        expect(set).toHaveBeenLastCalledWith('fortune', undefined);
    });

    it('hides the extras when withExtras is false', () => {
        setup({}, false);
        expect(document.getElementById('char-move')).toBeNull();
        expect(document.getElementById('char-base-ws')).not.toBeNull();
    });
});
