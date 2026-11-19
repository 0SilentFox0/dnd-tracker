// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EditionSection } from '../EditionSection';

import '@/components/ui/__tests__/match-media';
import { defaultRulesFor } from '@/lib/utils/rules/section-registry';

afterEach(cleanup);

describe('EditionSection', () => {
    it('shows the stored preset', () => {
        render(
            <EditionSection
                form={
                    {
                        campaignId: 'c',
                        data: defaultRulesFor({ key: 'wfrp' }),
                        set: vi.fn(),
                    } as unknown as Parameters<typeof EditionSection>[0]['form']
                }
            />
        );

        expect(
            screen.getByRole('combobox', {
                name: 'rules.sections.edition.preset',
            })
        ).toBeTruthy();
    });
});
