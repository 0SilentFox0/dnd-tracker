// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SpellReferenceDetail } from '@/components/campaigns/info/detail/SpellReferenceDetail';
import { render } from '@/lib/i18n/test/render-uk';
import type { SpellForReference } from '@/types/info-reference';

vi.unmock('next-intl');

const saveText = vi.fn();

const setDraft = vi.fn();

vi.mock('@/lib/hooks/spells', () => ({
    useUpdateSpellAppearance: (_c: string, _id: string, initial: string) => ({
        draft: { data: initial, set: setDraft },
        status: { isSaving: false },
        save: vi.fn(),
        saveText,
    }),
}));
vi.mock('@/lib/hooks/abilities', () => ({
    useAbilityText: () => ({ lines: () => [] }),
}));
vi.mock('@/components/spells/preview/SpellBattlePreview', () => ({
    SpellBattlePreview: () => null,
}));

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

const spell = {
    id: 's1',
    name: 'Вогняна куля',
    level: 3,
    targeting: 'area',
    facetKey: 'k',
    cost: { type: 'free' },
    resolution: { kind: 'none' },
    dice: 0,
    description: null,
    effects: [],
    appearanceDescription: 'Куля',
    groupName: null,
    icon: null,
} as unknown as SpellForReference;

describe('SpellReferenceDetail', () => {
    it('lets the DM edit the appearance and saves the new text', () => {
        render(<SpellReferenceDetail campaignId="c" item={spell} isDM />);

        fireEvent.click(screen.getByRole('button', { name: 'Редагувати' }));
        fireEvent.change(screen.getByRole('textbox'), {
            target: { value: 'Нова' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Зберегти' }));

        expect(saveText).toHaveBeenCalledWith('Нова');
        expect(setDraft).toHaveBeenCalledWith('Нова');
    });

    it('has no edit button for players', () => {
        render(
            <SpellReferenceDetail campaignId="c" item={spell} isDM={false} />
        );

        expect(screen.queryByRole('button', { name: 'Редагувати' })).toBeNull();
        expect(screen.getByText('Куля')).toBeTruthy();
    });
});
