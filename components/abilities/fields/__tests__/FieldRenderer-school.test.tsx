// @vitest-environment happy-dom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FieldRenderer } from '@/components/abilities/fields/FieldRenderer';
import { AbilityEditorProvider } from '@/components/abilities/editor-context';
import { renderWithIntl } from '@/lib/i18n/test/render-with-intl';

vi.mock('@/lib/hooks/spells', () => ({
    useSpellGroups: () => ({
        data: [{ id: 'school-id-1', name: 'Хаос' }],
    }),
}));

afterEach(cleanup);

describe('FieldRenderer school field', () => {
    it('shows the spell school name in a select while keeping its id as the value', async () => {
        await renderWithIntl(
            <AbilityEditorProvider
                value={{ campaignId: 'campaign-1', errorsByPath: {} }}
            >
                <FieldRenderer
                    meta={{ name: 'school', input: 'text', label: 'Школа' }}
                    value="school-id-1"
                    onChange={vi.fn()}
                    path="effects.0.school"
                    owner="spellTargeting"
                />
            </AbilityEditorProvider>,
            { locale: 'uk', namespaces: ['common', 'abilityRegistry'] }
        );

        expect(screen.getByRole('combobox')).toHaveTextContent('Хаос');
        expect(
            screen.queryByDisplayValue('school-id-1')
        ).not.toBeInTheDocument();
    });
});
