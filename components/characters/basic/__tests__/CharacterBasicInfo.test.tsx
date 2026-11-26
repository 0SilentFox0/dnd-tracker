// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CharacterBasicInfo } from '@/components/characters/basic/CharacterBasicInfo';
import { CharacterType } from '@/lib/constants/characters';
import type { CharacterFormBindings } from '@/lib/utils/characters/form/bindings';

vi.mock('@/lib/hooks/characters', () => ({
    useArchetypeOptions: () => ({ options: [], universalLabel: 'any' }),
    useClassEntriesField: () => vi.fn(),
    useAlignmentLabel: () => (value: string | null) => value ?? '',
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
        render(<CharacterBasicInfo basicInfo={bindings} hide={{ class: true }} />);

        expect(ids()).not.toContain('class');
        expect(ids()).not.toContain('subclass');
    });

    it('has no portrait section: the banner owns the portrait', () => {
        const { container } = render(<CharacterBasicInfo basicInfo={bindings} />);

        expect(container.querySelectorAll('section')).toHaveLength(3);
        expect(screen.queryByText('characters.form.basic.avatar')).toBeNull();
    });

    it('type is a segmented radiogroup and alignment a radiogroup', () => {
        render(<CharacterBasicInfo basicInfo={bindings} />);

        expect(document.getElementById('type')?.getAttribute('role')).toBe(
            'radiogroup'
        );
        expect(
            document.getElementById('alignment')?.getAttribute('role')
        ).toBe('radiogroup');
    });

    it('puts the slots into the class card row', () => {
        render(
            <CharacterBasicInfo
                basicInfo={bindings}
                slots={{
                    classAction: <button>act</button>,
                    classAside: <div>hp-tile</div>,
                }}
            />
        );

        expect(screen.getByText('act')).toBeTruthy();
        expect(screen.getByText('hp-tile')).toBeTruthy();
    });
});
