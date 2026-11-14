// @vitest-environment happy-dom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SummaryStep } from '../system/SummaryStep';

import '@/components/ui/__tests__/match-media';
import { renderWithIntl } from '@/lib/i18n/test/render-with-intl';
import type { CompositionPreview } from '@/lib/utils/rules/systems/preview';

vi.unmock('next-intl');

afterEach(cleanup);

const preview: CompositionPreview = {
    sheetBlocks: 1,
    rulesSections: [],
    contentKinds: ['artifact-sets', 'spells'],
    dmSections: [],
    actions: [],
    added: [],
    removed: [],
    setup: [],
};

describe('SummaryStep', () => {
    it('shows translated content kinds, not keys', async () => {
        await renderWithIntl(<SummaryStep preview={preview} />, {
            locale: 'en',
            namespaces: [
                'common',
                'validation',
                'rules',
                'gameTerms',
                'battleCommon',
            ],
        });

        const text = screen.getByTestId('module-summary').textContent ?? '';

        expect(text).toContain('Artifact sets, Spells');
        expect(text).not.toContain('contentKinds.');
    });
});
