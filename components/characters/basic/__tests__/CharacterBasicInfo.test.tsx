// @vitest-environment happy-dom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CharacterBasicInfo } from '@/components/characters/basic/CharacterBasicInfo';
import { CharacterType } from '@/lib/constants/characters';
import type { CharacterFormBindings } from '@/lib/utils/characters/form/bindings';

vi.mock('@/lib/hooks/characters', () => ({
    useArchetypeOptions: () => ({ options: [], universalLabel: 'any' }),
    useClassEntriesField: () => vi.fn(),
    useAlignmentLabel: () => (v: string | null) => v ?? '',
}));

afterEach(cleanup);

const bindings = {
    data: {
        name: 'Zehir',
        type: CharacterType.PLAYER,
        controlledBy: 'u1',
        level: 3,
        class: 'Mage',
        subclass: '',
        archetype: '',
        race: 'Elf',
        subrace: '',
        alignment: '',
        avatar: '',
        classes: [],
    },
    set: vi.fn(),
} as unknown as CharacterFormBindings['basicInfo'];

const ids = () =>
    [
        ...screen.queryAllByRole('textbox'),
        ...screen.queryAllByRole('combobox'),
        ...screen.queryAllByRole('spinbutton'),
    ]
        .map((el) => el.id)
        .sort();

describe('CharacterBasicInfo', () => {
    it('renders every field in the full layout', () => {
        render(<CharacterBasicInfo basicInfo={bindings} />);

        expect(ids()).toEqual(
            [
                'archetype',
                'class',
                'controlledBy',
                'level',
                'name',
                'race',
                'subclass',
                'subrace',
            ].sort()
        );
    });

    it('omits the class field with hide.class', () => {
        render(
            <CharacterBasicInfo basicInfo={bindings} hide={{ class: true }} />
        );

        expect(ids()).not.toContain('class');
        expect(ids()).not.toContain('subclass');
    });

    it('has no portrait section or upload', () => {
        render(<CharacterBasicInfo basicInfo={bindings} />);

        expect(screen.queryByText(/sections\.portrait/)).toBeNull();
        expect(screen.queryByText('characters.form.basic.avatar')).toBeNull();
    });

    it('renders type as a radiogroup with two radios', () => {
        render(<CharacterBasicInfo basicInfo={bindings} />);

        const group = screen.getByRole('radiogroup', {
            name: 'characters.form.basic.type',
        });

        expect(within(group).getAllByRole('radio')).toHaveLength(2);
    });

    it('renders alignment as a radiogroup with 10 options', () => {
        render(<CharacterBasicInfo basicInfo={bindings} />);

        const group = screen
            .getAllByRole('radiogroup')
            .find((g) => g.id === 'alignment') as HTMLElement;

        expect(
            within(group.parentElement as HTMLElement).getAllByRole('radio')
        ).toHaveLength(10);
    });

    it('renders the class slots', () => {
        render(
            <CharacterBasicInfo
                basicInfo={bindings}
                classSlots={{ action: <i>act</i>, aside: <i>side</i> }}
            />
        );

        expect(screen.getByText('act')).toBeTruthy();
        expect(screen.getByText('side')).toBeTruthy();
    });
});
