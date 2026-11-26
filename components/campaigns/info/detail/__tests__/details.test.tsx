// @vitest-environment happy-dom
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SpellReferenceRow } from '../../rows/SpellReferenceRow';
import { SpellReferenceDetail } from '../SpellReferenceDetail';

import { renderWithIntl } from '@/lib/i18n/test/render-with-intl';
import type { SpellForReference } from '@/types/info-reference';

const save = vi.fn();

vi.mock('@/lib/hooks/spells', () => ({
    useUpdateSpellAppearance: () => ({
        draft: { data: 'glow', set: vi.fn() },
        status: { isSaving: false },
        save,
    }),
}));
vi.mock('@/lib/hooks/abilities', () => ({
    useAbilityText: () => ({ lines: () => [] }),
}));
vi.mock('@/lib/utils/campaigns/info-reference', () => ({
    formatMechanicsSpell: () => 'mechanics',
}));

const spell = {
    id: 's1',
    name: 'Fire Bolt',
    level: 1,
    description: null,
    effects: [],
    appearanceDescription: 'glow',
    groupName: null,
    icon: null,
} as unknown as SpellForReference;

const NS = ['common', 'spells'] as const;

describe('SpellReferenceDetail', () => {
    beforeEach(() => vi.clearAllMocks());

    it('lets the DM edit and save the appearance', async () => {
        await renderWithIntl(
            <SpellReferenceDetail campaignId="c" item={spell} isDM />,
            { locale: 'en', namespaces: NS }
        );

        fireEvent.click(screen.getByLabelText('Edit'));
        fireEvent.click(screen.getByText('Save appearance description'));
        expect(save).toHaveBeenCalled();
    });

    it('hides the edit control from players', async () => {
        await renderWithIntl(
            <SpellReferenceDetail campaignId="c" item={spell} isDM={false} />,
            { locale: 'en', namespaces: NS }
        );

        expect(screen.queryByLabelText('Edit')).toBeNull();
    });

    it('marks the selected row', async () => {
        await renderWithIntl(
            <SpellReferenceRow item={spell} selected onSelect={vi.fn()} />,
            { locale: 'en', namespaces: NS }
        );

        expect(screen.getByRole('button').getAttribute('aria-current')).toBe(
            'true'
        );
    });
});
