// @vitest-environment happy-dom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.unmock('next-intl');
vi.unmock('@/lib/i18n/use-translator');

import { MonsterStatblock } from '@/components/units/MonsterStatblock';
import { renderWithIntl } from '@/lib/i18n/test/render-with-intl';

describe('MonsterStatblock alignment', () => {
    afterEach(cleanup);

    it('shows the translated alignment', async () => {
        await renderWithIntl(
            <MonsterStatblock block={{ alignment: 'Chaotic Evil' }} />,
            { locale: 'uk', namespaces: ['gameTerms'] }
        );

        expect(screen.getByText('Хаотично-злий')).toBeTruthy();
    });

    it('keeps free text as is', async () => {
        await renderWithIntl(
            <MonsterStatblock block={{ alignment: 'any alignment' }} />,
            { locale: 'uk', namespaces: ['gameTerms'] }
        );

        expect(screen.getByText('any alignment')).toBeTruthy();
    });
});
