// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CharacterBasicInfo } from '@/components/characters/basic/CharacterBasicInfo';
import { CharacterType } from '@/lib/constants/characters';
import type { CharacterFormBindings } from '@/lib/utils/characters/form/bindings';

vi.mock('@/lib/hooks/characters', () => ({
    useArchetypeOptions: () => ({ options: [], universalLabel: 'any' }),
    useClassEntriesField: () => vi.fn(),
}));

vi.mock('@/components/common/fields/ImageUpload', () => ({
    ImageUpload: ({ label }: { label: string }) => <div>{label}</div>,
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
                'alignment',
                'archetype',
                'class',
                'controlledBy',
                'level',
                'name',
                'race',
                'subclass',
                'subrace',
                'type',
            ].sort()
        );
    });

    it('omits the class field with hide.class', () => {
        render(<CharacterBasicInfo basicInfo={bindings} hide={{ class: true }} />);

        expect(ids()).not.toContain('class');
        expect(ids()).not.toContain('subclass');
    });

    it('hides the portrait section in player view', () => {
        const { container } = render(
            <CharacterBasicInfo basicInfo={bindings} isPlayerView />
        );

        expect(container.querySelectorAll('section')).toHaveLength(2);
        expect(screen.queryByText('characters.form.basic.avatar')).toBeNull();
    });
});
